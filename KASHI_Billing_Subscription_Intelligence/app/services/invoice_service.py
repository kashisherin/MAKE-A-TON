import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status

from app.models.financial import (
    Invoice,
    InvoiceLine,
    InvoiceTaxBreakdown,
    TaxRule,
    Discount,
    DiscountRedemption,
    utc_now,
)
from app.core.config import settings
from app.schemas.invoices import InvoiceCreate, InvoiceLineCreate
from app.core.security import TenantContext
from app.domain.taxation.engine import TaxEngine
from app.domain.discounts.engine import DiscountEngine
from app.domain.audit.service import AuditService
from app.services.money import money, CENT


class InvoiceService:
    @staticmethod
    def generate_invoice_number(db: Session, prefix: str = "INV") -> str:
        now = datetime.now(timezone.utc)
        year_month = now.strftime("%Y%m")
        count_stmt = select(func.count(Invoice.id)).where(
            Invoice.invoice_number.like(f"{prefix}-{year_month}-%")
        )
        existing_count = db.scalar(count_stmt) or 0
        sequence = existing_count + 1
        return f"{prefix}-{year_month}-{sequence:05d}"

    @classmethod
    def create_invoice(
        cls,
        db: Session,
        data: InvoiceCreate,
        ctx: TenantContext,
    ) -> Invoice:
        org_id = data.organization_id or ctx.organization_id

        # 1. Check duplicate billing for subscription
        if data.subscription_id and data.billing_period_start and data.billing_period_end:
            existing_inv = db.scalar(
                select(Invoice).where(
                    and_(
                        Invoice.subscription_id == data.subscription_id,
                        Invoice.billing_period_start == data.billing_period_start,
                        Invoice.billing_period_end == data.billing_period_end,
                        Invoice.status != "void",
                    )
                )
            )
            if existing_inv:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An active invoice ({existing_inv.invoice_number}) already exists for subscription {data.subscription_id} and the specified billing period.",
                )

        invoice_number = cls.generate_invoice_number(db)
        inv = Invoice(
            invoice_number=invoice_number,
            customer_id=data.customer_id,
            organization_id=org_id,
            subscription_id=data.subscription_id,
            billing_period_start=data.billing_period_start,
            billing_period_end=data.billing_period_end,
            currency=data.currency.upper(),
            status="draft",
            due_at=data.due_at,
            notes=data.notes,
            customer_address=data.customer_address,
            place_of_supply=data.place_of_supply or "KA",
            customer_tax_id=data.customer_tax_id,
            subtotal=Decimal("0.00"),
            discount_total=Decimal("0.00"),
            tax_total=Decimal("0.00"),
            total=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
            outstanding_balance=Decimal("0.00"),
        )
        db.add(inv)
        db.flush()  # Allocate ID

        # 2. Query available active tax rules for jurisdiction
        country = "IND" if data.currency.upper() == "INR" else "USA"
        tax_rules = db.scalars(
            select(TaxRule).where(
                and_(
                    TaxRule.is_active.is_(True),
                    TaxRule.jurisdiction_country == country,
                )
            )
        ).all()

        default_gst_rate = settings.default_tax_rate_percent
        if tax_rules:
            active_rule = tax_rules[0]
            default_gst_rate = active_rule.rate_percent

        subtotal_acc = Decimal("0.00")
        line_discount_acc = Decimal("0.00")
        tax_acc = Decimal("0.00")

        # 3. Process line items
        for line_in in data.lines:
            unit_price = line_in.unit_price.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            quantity = line_in.quantity.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            line_subtotal = (quantity * unit_price).quantize(CENT, rounding=ROUND_HALF_UP)
            line_discount = min(line_in.discount_amount.quantize(CENT, rounding=ROUND_HALF_UP), line_subtotal)

            tax_res = TaxEngine.calculate_line_tax(
                line_subtotal=line_subtotal,
                discount_amount=line_discount,
                applicable_rate_percent=default_gst_rate,
                is_inclusive=False,
                is_exempt=False,
                place_of_supply=inv.place_of_supply,
                supplier_state="KA",
                jurisdiction_country=country,
            )

            line_res_total = line_subtotal - line_discount + tax_res.tax_total
            line_model = InvoiceLine(
                invoice_id=inv.id,
                description=line_in.description,
                product_id=line_in.product_id,
                plan_id=line_in.plan_id,
                quantity=quantity,
                unit_price=unit_price,
                line_subtotal=line_subtotal,
                discount_amount=line_discount,
                tax_amount=tax_res.tax_total,
                line_total=line_res_total,
            )
            db.add(line_model)
            db.flush()

            # Record tax breakdowns
            for comp in tax_res.components:
                breakdown = InvoiceTaxBreakdown(
                    invoice_id=inv.id,
                    invoice_line_id=line_model.id,
                    tax_name=comp.tax_name,
                    tax_code=comp.tax_code,
                    rate_percent=comp.rate_percent,
                    taxable_amount=comp.taxable_amount,
                    tax_amount=comp.tax_amount,
                )
                db.add(breakdown)

            subtotal_acc += line_subtotal
            line_discount_acc += line_discount
            tax_acc += tax_res.tax_total

        # 4. Process invoice-level discount if coupon provided
        order_discount = Decimal("0.00")
        if data.discount_code:
            discount_model = db.scalar(
                select(Discount).where(
                    and_(
                        Discount.code == data.discount_code.strip(),
                        Discount.is_active.is_(True),
                    )
                )
            )
            if discount_model:
                eval_res = DiscountEngine.evaluate_discount(
                    discount_type=discount_model.discount_type,
                    discount_value=discount_model.value,
                    order_amount=subtotal_acc,
                    min_order_amount=discount_model.min_order_amount,
                    max_discount_amount=discount_model.max_discount_amount,
                    max_redemptions=discount_model.max_redemptions,
                    current_redemption_count=discount_model.redemption_count,
                    starts_at=discount_model.starts_at,
                    expires_at=discount_model.expires_at,
                    is_active=discount_model.is_active,
                )
                if eval_res.is_valid:
                    order_discount = eval_res.discount_amount
                    discount_model.redemption_count += 1
                    redemption = DiscountRedemption(
                        discount_id=discount_model.id,
                        invoice_id=inv.id,
                        customer_id=inv.customer_id,
                        amount_applied=order_discount,
                    )
                    db.add(redemption)

        total_discount = line_discount_acc + order_discount
        grand_total = max(Decimal("0.00"), subtotal_acc - total_discount + tax_acc)

        inv.subtotal = subtotal_acc
        inv.discount_total = total_discount
        inv.tax_total = tax_acc
        inv.total = grand_total
        inv.outstanding_balance = grand_total

        AuditService.record_event(
            db=db,
            entity_type="Invoice",
            entity_id=str(inv.id),
            action="CREATE",
            actor_id=ctx.actor_id,
            organization_id=org_id,
            after_state={"invoice_number": inv.invoice_number, "total": str(inv.total)},
        )

        db.commit()
        db.refresh(inv)
        return inv

    @classmethod
    def finalize_invoice(
        cls,
        db: Session,
        invoice_id: int,
        ctx: TenantContext,
    ) -> Invoice:
        inv = db.scalar(
            select(Invoice).where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.organization_id == ctx.organization_id,
                )
            )
        )
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if inv.status != "draft":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot finalize invoice with status '{inv.status}'. Only draft invoices can be finalized.",
            )

        now = utc_now()
        inv.status = "issued"
        inv.issued_at = now
        inv.finalized_at = now

        AuditService.record_event(
            db=db,
            entity_type="Invoice",
            entity_id=str(inv.id),
            action="FINALIZE",
            actor_id=ctx.actor_id,
            organization_id=ctx.organization_id,
            before_state={"status": "draft"},
            after_state={"status": "issued", "finalized_at": str(now)},
        )
        db.commit()
        db.refresh(inv)
        return inv

    @classmethod
    def void_invoice(
        cls,
        db: Session,
        invoice_id: int,
        reason: str | None,
        ctx: TenantContext,
    ) -> Invoice:
        inv = db.scalar(
            select(Invoice).where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.organization_id == ctx.organization_id,
                )
            )
        )
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if inv.status == "void":
            return inv
        if inv.amount_paid > Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot void invoice {inv.invoice_number} because {inv.amount_paid} has already been paid. Use refund/credit note workflow.",
            )

        inv.status = "void"
        inv.voided_at = utc_now()
        if reason:
            inv.notes = f"{inv.notes or ''}\nVoid reason: {reason}".strip()

        AuditService.record_event(
            db=db,
            entity_type="Invoice",
            entity_id=str(inv.id),
            action="VOID",
            actor_id=ctx.actor_id,
            organization_id=ctx.organization_id,
            after_state={"status": "void", "reason": reason},
        )
        db.commit()
        db.refresh(inv)
        return inv

    @classmethod
    def update_payment_progress(cls, invoice: Invoice) -> None:
        """Derive status from amount_paid and total."""
        if invoice.status == "void":
            return
        if invoice.amount_paid >= invoice.total:
            invoice.status = "paid"
            invoice.outstanding_balance = Decimal("0.00")
        elif invoice.amount_paid > Decimal("0.00"):
            invoice.status = "partially_paid"
            invoice.outstanding_balance = invoice.total - invoice.amount_paid
        else:
            invoice.outstanding_balance = invoice.total
            now = utc_now()
            if invoice.due_at and now > invoice.due_at and invoice.status == "issued":
                invoice.status = "overdue"
