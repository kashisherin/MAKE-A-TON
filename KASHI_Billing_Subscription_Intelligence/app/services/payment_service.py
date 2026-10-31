from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException, status

from app.models.financial import (
    Payment,
    PaymentAllocation,
    Invoice,
    Refund,
    utc_now,
)
from app.schemas.payments import (
    PaymentCreate,
    RefundCreate,
    ReconciliationInput,
    ReconciliationResponse,
    ReconciliationDiscrepancy,
)
from app.core.security import TenantContext
from app.domain.audit.service import AuditService
from app.services.invoice_service import InvoiceService
from app.services.money import money, CENT


class PaymentService:
    @classmethod
    def record_payment(
        cls,
        db: Session,
        data: PaymentCreate,
        ctx: TenantContext,
    ) -> Payment:
        org_id = data.organization_id or ctx.organization_id

        # 1. Idempotency verification
        existing_pmt = db.scalar(
            select(Payment).where(Payment.idempotency_key == data.idempotency_key)
        )
        if existing_pmt:
            return existing_pmt

        payment_amount = data.amount.quantize(CENT)
        if payment_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Payment amount must be greater than zero.",
            )

        # 2. Build allocation map
        allocation_targets: list[tuple[Invoice, Decimal]] = []
        if data.allocations:
            allocated_sum = Decimal("0.00")
            for alloc_in in data.allocations:
                inv = db.scalar(
                    select(Invoice).where(
                        and_(
                            Invoice.id == alloc_in.invoice_id,
                            Invoice.organization_id == org_id,
                        )
                    )
                )
                if not inv:
                    raise HTTPException(status_code=404, detail=f"Invoice ID {alloc_in.invoice_id} not found.")
                if inv.status in ("void", "paid"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot allocate payment to invoice {inv.invoice_number} with status '{inv.status}'.",
                    )
                alloc_amt = alloc_in.amount.quantize(CENT)
                if alloc_amt > inv.outstanding_balance:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Allocated amount {alloc_amt} exceeds invoice {inv.invoice_number} outstanding balance {inv.outstanding_balance}.",
                    )
                allocated_sum += alloc_amt
                allocation_targets.append((inv, alloc_amt))

            if allocated_sum > payment_amount:
                raise HTTPException(
                    status_code=400,
                    detail=f"Total allocated sum {allocated_sum} exceeds gross payment amount {payment_amount}.",
                )
        elif data.invoice_id:
            inv = db.scalar(
                select(Invoice).where(
                    and_(
                        Invoice.id == data.invoice_id,
                        Invoice.organization_id == org_id,
                    )
                )
            )
            if not inv:
                raise HTTPException(status_code=404, detail=f"Invoice ID {data.invoice_id} not found.")
            if inv.status in ("void", "paid"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot allocate payment to invoice {inv.invoice_number} with status '{inv.status}'.",
                )
            if payment_amount > inv.outstanding_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment amount {payment_amount} exceeds invoice outstanding balance {inv.outstanding_balance}.",
                )
            allocation_targets.append((inv, payment_amount))

        # 3. Create payment entity
        pmt = Payment(
            organization_id=org_id,
            customer_id=data.customer_id,
            invoice_id=data.invoice_id,
            provider_reference=data.provider_reference,
            idempotency_key=data.idempotency_key,
            amount=payment_amount,
            currency=data.currency.upper(),
            method=data.method,
            status="cleared",
        )
        db.add(pmt)
        db.flush()

        # 4. Create allocations & update invoice balances
        for inv, amt in allocation_targets:
            allocation = PaymentAllocation(
                payment_id=pmt.id,
                invoice_id=inv.id,
                amount=amt,
                allocated_at=utc_now(),
            )
            db.add(allocation)
            inv.amount_paid += amt
            InvoiceService.update_payment_progress(inv)

        AuditService.record_event(
            db=db,
            entity_type="Payment",
            entity_id=str(pmt.id),
            action="RECORD_PAYMENT",
            actor_id=ctx.actor_id,
            organization_id=org_id,
            after_state={"amount": str(pmt.amount), "method": pmt.method, "status": pmt.status},
        )

        db.commit()
        db.refresh(pmt)
        return pmt

    @classmethod
    def record_refund(
        cls,
        db: Session,
        payment_id: int,
        data: RefundCreate,
        ctx: TenantContext,
    ) -> Refund:
        # 1. Idempotency verification
        existing_ref = db.scalar(
            select(Refund).where(Refund.idempotency_key == data.idempotency_key)
        )
        if existing_ref:
            return existing_ref

        pmt = db.scalar(
            select(Payment).where(
                and_(
                    Payment.id == payment_id,
                    Payment.organization_id == ctx.organization_id,
                )
            )
        )
        if not pmt:
            raise HTTPException(status_code=404, detail="Payment not found")
        if pmt.status != "cleared":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot refund payment with status '{pmt.status}'.",
            )

        # Calculate already refunded sum
        already_refunded = sum((r.amount for r in pmt.refunds if r.status == "completed"), Decimal("0.00"))
        available_to_refund = pmt.amount - already_refunded

        refund_amt = data.amount.quantize(CENT)
        if refund_amt <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Refund amount must be greater than zero.")
        if refund_amt > available_to_refund:
            raise HTTPException(
                status_code=400,
                detail=f"Refund amount {refund_amt} exceeds refundable balance {available_to_refund}.",
            )

        refund = Refund(
            payment_id=pmt.id,
            organization_id=ctx.organization_id,
            amount=refund_amt,
            currency=pmt.currency,
            reason=data.reason,
            provider_refund_reference=data.provider_refund_reference,
            idempotency_key=data.idempotency_key,
            status="completed",
        )
        db.add(refund)

        # Deduct amount from invoice allocations proportionally or sequentially
        remaining_to_deduct = refund_amt
        for alloc in pmt.allocations:
            if remaining_to_deduct <= Decimal("0.00"):
                break
            inv = alloc.invoice
            deduct_from_inv = min(remaining_to_deduct, inv.amount_paid)
            inv.amount_paid -= deduct_from_inv
            remaining_to_deduct -= deduct_from_inv
            InvoiceService.update_payment_progress(inv)

        # If fully refunded, update payment status
        if already_refunded + refund_amt >= pmt.amount:
            pmt.status = "refunded"

        AuditService.record_event(
            db=db,
            entity_type="Refund",
            entity_id=str(refund.id),
            action="RECORD_REFUND",
            actor_id=ctx.actor_id,
            organization_id=ctx.organization_id,
            after_state={"amount": str(refund.amount), "reason": refund.reason},
        )

        db.commit()
        db.refresh(refund)
        return refund

    @classmethod
    def reconcile_payments(
        cls,
        db: Session,
        data: ReconciliationInput,
        ctx: TenantContext,
    ) -> ReconciliationResponse:
        discrepancies: list[ReconciliationDiscrepancy] = []
        matched_count = 0

        for item in data.items:
            pmt = db.scalar(
                select(Payment).where(
                    and_(
                        Payment.provider_reference == item.provider_reference,
                        Payment.organization_id == ctx.organization_id,
                    )
                )
            )
            if not pmt:
                discrepancies.append(
                    ReconciliationDiscrepancy(
                        provider_reference=item.provider_reference,
                        system_payment_id=None,
                        system_status=None,
                        system_amount=None,
                        provider_status=item.provider_status,
                        provider_amount=item.expected_amount,
                        issue="Payment missing in KASHI database",
                    )
                )
            elif pmt.amount != item.expected_amount:
                discrepancies.append(
                    ReconciliationDiscrepancy(
                        provider_reference=item.provider_reference,
                        system_payment_id=pmt.id,
                        system_status=pmt.status,
                        system_amount=pmt.amount,
                        provider_status=item.provider_status,
                        provider_amount=item.expected_amount,
                        issue=f"Amount mismatch: KASHI={pmt.amount} vs Provider={item.expected_amount}",
                    )
                )
            elif pmt.status != item.provider_status:
                discrepancies.append(
                    ReconciliationDiscrepancy(
                        provider_reference=item.provider_reference,
                        system_payment_id=pmt.id,
                        system_status=pmt.status,
                        system_amount=pmt.amount,
                        provider_status=item.provider_status,
                        provider_amount=item.expected_amount,
                        issue=f"Status mismatch: KASHI={pmt.status} vs Provider={item.provider_status}",
                    )
                )
            else:
                matched_count += 1

        return ReconciliationResponse(
            total_checked=len(data.items),
            matched_count=matched_count,
            discrepancies=discrepancies,
        )

