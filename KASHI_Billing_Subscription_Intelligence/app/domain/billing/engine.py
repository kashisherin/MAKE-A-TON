from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.financial import (
    BillingRun,
    BillingEvent,
    Invoice,
    utc_now,
)
from app.integrations.contracts import SubscriptionProvider, SubscriptionSnapshot
from app.schemas.invoices import InvoiceCreate, InvoiceLineCreate
from app.services.invoice_service import InvoiceService
from app.core.security import TenantContext
from app.domain.audit.service import AuditService


class RecurringBillingEngine:
    @staticmethod
    def calculate_period(
        as_of_date: datetime,
        interval: str,
    ) -> tuple[datetime, datetime]:
        interval = interval.lower()
        start = as_of_date.replace(hour=0, minute=0, second=0, microsecond=0)
        if interval == "quarterly":
            end = start + relativedelta(months=3) - timedelta(seconds=1)
        elif interval == "annual" or interval == "yearly":
            end = start + relativedelta(years=1) - timedelta(seconds=1)
        else:  # default monthly
            end = start + relativedelta(months=1) - timedelta(seconds=1)
        return start, end

    @staticmethod
    def calculate_proration(
        full_price: Decimal,
        total_days_in_period: int,
        active_days: int,
    ) -> Decimal:
        """Calculate prorated amount for mid-cycle additions or changes."""
        if total_days_in_period <= 0 or active_days <= 0:
            return Decimal("0.00")
        factor = Decimal(str(active_days)) / Decimal(str(total_days_in_period))
        return (full_price * factor).quantize(Decimal("0.01"))

    @classmethod
    def execute_billing_run(
        cls,
        db: Session,
        subscription_provider: SubscriptionProvider,
        as_of_date: datetime | None = None,
        organization_id: str | None = None,
        run_type: str = "scheduled",
        actor_id: str = "billing_scheduler",
    ) -> BillingRun:
        now = as_of_date or datetime.now(timezone.utc)
        org_id = organization_id or "org_default"

        billing_run = BillingRun(
            organization_id=org_id,
            run_type=run_type,
            status="started",
            started_at=utc_now(),
        )
        db.add(billing_run)
        db.flush()

        ctx = TenantContext(organization_id=org_id, actor_id=actor_id)

        try:
            billable_subs = subscription_provider.get_billable_subscriptions(now.isoformat())
        except Exception as e:
            billing_run.status = "failed"
            billing_run.error_summary = f"Failed to fetch billable subscriptions: {str(e)}"
            billing_run.completed_at = utc_now()
            db.commit()
            return billing_run

        billing_run.total_subscriptions_evaluated = len(billable_subs)
        invoices_created = 0
        total_billed = Decimal("0.00")
        errors_count = 0
        error_logs: list[str] = []

        for sub in billable_subs:
            period_start, period_end = cls.calculate_period(now, sub.billing_interval)

            # Check for existing invoice for this period
            existing = db.scalar(
                select(Invoice).where(
                    and_(
                        Invoice.subscription_id == sub.subscription_id,
                        Invoice.billing_period_start == period_start,
                        Invoice.billing_period_end == period_end,
                        Invoice.status != "void",
                    )
                )
            )
            if existing:
                event = BillingEvent(
                    billing_run_id=billing_run.id,
                    subscription_id=sub.subscription_id,
                    customer_id=sub.customer_id,
                    status="skipped",
                    invoice_id=existing.id,
                    error_message=f"Invoice {existing.invoice_number} already exists for period.",
                )
                db.add(event)
                continue

            try:
                # Use subscription recurring price (assume 1000 base if not specified)
                base_price = getattr(sub, "price", Decimal("1000.00"))
                currency = getattr(sub, "currency", "INR")
                due_date = now + timedelta(days=15)

                invoice_in = InvoiceCreate(
                    customer_id=sub.customer_id,
                    organization_id=sub.organization_id or org_id,
                    subscription_id=sub.subscription_id,
                    billing_period_start=period_start,
                    billing_period_end=period_end,
                    currency=currency,
                    due_at=due_date,
                    notes=f"Automated recurring billing for subscription {sub.subscription_id}",
                    lines=[
                        InvoiceLineCreate(
                            description=f"Subscription Plan {sub.plan_id} ({sub.billing_interval.capitalize()})",
                            plan_id=sub.plan_id,
                            quantity=Decimal("1.0000"),
                            unit_price=base_price,
                        )
                    ],
                )

                created_inv = InvoiceService.create_invoice(db=db, data=invoice_in, ctx=ctx)
                # Auto-finalize scheduled invoice
                InvoiceService.finalize_invoice(db=db, invoice_id=created_inv.id, ctx=ctx)

                invoices_created += 1
                total_billed += created_inv.total

                event = BillingEvent(
                    billing_run_id=billing_run.id,
                    subscription_id=sub.subscription_id,
                    customer_id=sub.customer_id,
                    status="success",
                    invoice_id=created_inv.id,
                )
                db.add(event)

            except Exception as e:
                errors_count += 1
                error_msg = f"Subscription {sub.subscription_id} billing error: {str(e)}"
                error_logs.append(error_msg)
                event = BillingEvent(
                    billing_run_id=billing_run.id,
                    subscription_id=sub.subscription_id,
                    customer_id=sub.customer_id,
                    status="failed",
                    error_message=error_msg,
                )
                db.add(event)

        billing_run.status = "completed" if errors_count == 0 else ("completed" if invoices_created > 0 else "failed")
        billing_run.invoices_generated = invoices_created
        billing_run.total_billed_amount = total_billed
        billing_run.errors_count = errors_count
        billing_run.error_summary = "\n".join(error_logs) if error_logs else None
        billing_run.completed_at = utc_now()

        AuditService.record_event(
            db=db,
            entity_type="BillingRun",
            entity_id=str(billing_run.id),
            action="EXECUTE_BILLING_RUN",
            actor_id=actor_id,
            organization_id=org_id,
            after_state={
                "invoices_generated": invoices_created,
                "total_billed": str(total_billed),
                "errors": errors_count,
            },
        )

        db.commit()
        db.refresh(billing_run)
        return billing_run

