from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.financial import Invoice, utc_now
from app.schemas.analytics import AgingBucket, OutstandingMetricsResponse


class OverdueManagementEngine:
    @classmethod
    def get_aging_analysis(
        cls,
        db: Session,
        organization_id: str,
    ) -> OutstandingMetricsResponse:
        now = datetime.now(timezone.utc)
        open_invoices = db.scalars(
            select(Invoice).where(
                and_(
                    Invoice.organization_id == organization_id,
                    Invoice.status.in_(["issued", "partially_paid", "overdue"]),
                )
            )
        ).all()

        current_total = Decimal("0.00")
        current_count = 0
        b1_30_total = Decimal("0.00")
        b1_30_count = 0
        b31_60_total = Decimal("0.00")
        b31_60_count = 0
        b61_90_total = Decimal("0.00")
        b61_90_count = 0
        b90_plus_total = Decimal("0.00")
        b90_plus_count = 0

        total_outstanding = Decimal("0.00")
        total_overdue = Decimal("0.00")
        critical_count = 0

        for inv in open_invoices:
            balance = inv.outstanding_balance
            total_outstanding += balance

            due = inv.due_at
            if due and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)

            if not due or due >= now:
                current_total += balance
                current_count += 1
            else:
                days_overdue = (now - due).days
                total_overdue += balance

                if days_overdue <= 30:
                    b1_30_total += balance
                    b1_30_count += 1
                elif days_overdue <= 60:
                    b31_60_total += balance
                    b31_60_count += 1
                elif days_overdue <= 90:
                    b61_90_total += balance
                    b61_90_count += 1
                else:
                    b90_plus_total += balance
                    b90_plus_count += 1
                    critical_count += 1

        buckets = [
            AgingBucket(bucket_name="Current", invoice_count=current_count, total_amount=current_total),
            AgingBucket(bucket_name="1-30 days", invoice_count=b1_30_count, total_amount=b1_30_total),
            AgingBucket(bucket_name="31-60 days", invoice_count=b31_60_count, total_amount=b31_60_total),
            AgingBucket(bucket_name="61-90 days", invoice_count=b61_90_count, total_amount=b61_90_total),
            AgingBucket(bucket_name="90+ days", invoice_count=b90_plus_count, total_amount=b90_plus_total),
        ]

        return OutstandingMetricsResponse(
            currency="INR",
            total_outstanding=total_outstanding,
            total_overdue=total_overdue,
            aging_buckets=buckets,
            critical_overdue_invoices_count=critical_count,
        )

    @classmethod
    def calculate_customer_reliability_score(
        cls,
        db: Session,
        customer_id: str,
        organization_id: str,
    ) -> dict:
        invoices = db.scalars(
            select(Invoice).where(
                and_(
                    Invoice.customer_id == customer_id,
                    Invoice.organization_id == organization_id,
                    Invoice.status != "void",
                )
            )
        ).all()

        if not invoices:
            return {
                "customer_id": customer_id,
                "reliability_score": Decimal("100.00"),
                "rating": "A",
                "total_invoices": 0,
                "paid_invoices": 0,
                "overdue_invoices": 0,
                "note": "New customer with no prior billing history",
            }

        total_count = len(invoices)
        paid_on_time = 0
        paid_late = 0
        currently_overdue = 0
        now = datetime.now(timezone.utc)

        for inv in invoices:
            due = inv.due_at
            if due and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            updated = inv.updated_at
            if updated and updated.tzinfo is None:
                updated = updated.replace(tzinfo=timezone.utc)

            if inv.status == "paid":
                # Check payment timing
                if not due or updated <= due:
                    paid_on_time += 1
                else:
                    paid_late += 1
            elif inv.status in ("issued", "partially_paid", "overdue"):
                if due and now > due:
                    currently_overdue += 1
                else:
                    paid_on_time += 1  # Not yet overdue

        score = (Decimal(str(paid_on_time)) * Decimal("100.00") +
                 Decimal(str(paid_late)) * Decimal("60.00") -
                 Decimal(str(currently_overdue)) * Decimal("40.00")) / Decimal(str(total_count))

        final_score = max(Decimal("0.00"), min(Decimal("100.00"), score)).quantize(Decimal("0.01"))
        if final_score >= Decimal("90.00"):
            rating = "A"
        elif final_score >= Decimal("75.00"):
            rating = "B"
        elif final_score >= Decimal("50.00"):
            rating = "C"
        elif final_score >= Decimal("35.00"):
            rating = "D"
        else:
            rating = "F"

        return {
            "customer_id": customer_id,
            "reliability_score": final_score,
            "rating": rating,
            "total_invoices": total_count,
            "paid_on_time": paid_on_time,
            "paid_late": paid_late,
            "currently_overdue": currently_overdue,
        }
