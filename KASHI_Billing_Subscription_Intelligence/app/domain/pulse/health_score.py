import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.models.financial import (
    Invoice,
    Payment,
    UtilizationRecord,
    UsageEvent,
    RevenueHealthScore,
    utc_now,
)
from app.schemas.pulse import (
    RevenueHealthScoreResponse,
    FactorDetail,
)


class RevenueHealthScoreEngine:
    CALCULATION_VERSION = "1.0.0"

    @classmethod
    def calculate_health_score(
        cls,
        db: Session,
        customer_id: str,
        organization_id: str,
    ) -> RevenueHealthScoreResponse:
        now = datetime.now(timezone.utc)
        factors: list[FactorDetail] = []
        missing_signals: list[str] = []

        # -------------------------------------------------------------
        # Factor 1: Seat Utilization (Weight: 30%)
        # -------------------------------------------------------------
        util_record = db.scalar(
            select(UtilizationRecord).where(
                and_(
                    UtilizationRecord.customer_id == customer_id,
                    UtilizationRecord.organization_id == organization_id,
                )
            ).order_by(UtilizationRecord.id.desc())
        )
        if util_record:
            util_pct = util_record.utilization_percentage
            util_score = min(Decimal("100.00"), util_pct)
            util_impact = (util_score * Decimal("0.30")).quantize(Decimal("0.01"))
            factors.append(
                FactorDetail(
                    factor_name="Seat Utilization",
                    weight=Decimal("0.30"),
                    observed_value=f"{util_pct}% ({util_record.actually_used_units}/{util_record.purchased_units} seats)",
                    score_impact=util_impact,
                    interpretation="Optimal utilization" if util_pct >= Decimal("75.00") else "Underutilization risk",
                )
            )
        else:
            missing_signals.append("Seat utilization metrics not found for customer.")
            util_score = Decimal("70.00")  # Neutral baseline
            util_impact = (util_score * Decimal("0.30")).quantize(Decimal("0.01"))
            factors.append(
                FactorDetail(
                    factor_name="Seat Utilization",
                    weight=Decimal("0.30"),
                    observed_value="Data Unavailable (Neutral Baseline 70%)",
                    score_impact=util_impact,
                    interpretation="Signal unavailable; using neutral baseline.",
                )
            )

        # -------------------------------------------------------------
        # Factor 2: Payment Reliability & Overdue History (Weight: 25%)
        # -------------------------------------------------------------
        invoices = db.scalars(
            select(Invoice).where(
                and_(
                    Invoice.customer_id == customer_id,
                    Invoice.organization_id == organization_id,
                    Invoice.status != "void",
                )
            )
        ).all()

        if invoices:
            overdue_count = sum(1 for inv in invoices if inv.status == "overdue")
            paid_count = sum(1 for inv in invoices if inv.status == "paid")
            total_invoices = len(invoices)

            if overdue_count == 0:
                payment_score = Decimal("100.00")
            elif overdue_count == 1:
                payment_score = Decimal("60.00")
            else:
                payment_score = Decimal("20.00")

            payment_impact = (payment_score * Decimal("0.25")).quantize(Decimal("0.01"))
            factors.append(
                FactorDetail(
                    factor_name="Payment Reliability",
                    weight=Decimal("0.25"),
                    observed_value=f"{paid_count}/{total_invoices} paid, {overdue_count} overdue",
                    score_impact=payment_impact,
                    interpretation="Strong payment discipline" if overdue_count == 0 else "Delinquent payment risks detected",
                )
            )
        else:
            missing_signals.append("No invoice billing history available.")
            payment_score = Decimal("80.00")
            payment_impact = (payment_score * Decimal("0.25")).quantize(Decimal("0.01"))
            factors.append(
                FactorDetail(
                    factor_name="Payment Reliability",
                    weight=Decimal("0.25"),
                    observed_value="No Prior Invoices (Neutral 80%)",
                    score_impact=payment_impact,
                    interpretation="No billing delinquency observed.",
                )
            )

        # -------------------------------------------------------------
        # Factor 3: Consumption Activity & Recency (Weight: 25%)
        # -------------------------------------------------------------
        thirty_days_ago = now - timedelta(days=30)
        recent_usage_count = db.scalar(
            select(func.count(UsageEvent.id)).where(
                and_(
                    UsageEvent.customer_id == customer_id,
                    UsageEvent.organization_id == organization_id,
                    UsageEvent.event_timestamp >= thirty_days_ago,
                )
            )
        ) or 0

        if recent_usage_count >= 50:
            usage_score = Decimal("100.00")
            usage_interp = "High daily active consumption"
        elif recent_usage_count > 0:
            usage_score = Decimal("75.00")
            usage_interp = "Moderate active consumption"
        else:
            usage_score = Decimal("30.00")
            usage_interp = "Stale activity in past 30 days"

        usage_impact = (usage_score * Decimal("0.25")).quantize(Decimal("0.01"))
        factors.append(
            FactorDetail(
                factor_name="Consumption Activity",
                weight=Decimal("0.25"),
                observed_value=f"{recent_usage_count} metered events in last 30d",
                score_impact=usage_impact,
                interpretation=usage_interp,
            )
        )

        # -------------------------------------------------------------
        # Factor 4: Payment Volume & Spend Recency (Weight: 20%)
        # -------------------------------------------------------------
        sixty_days_ago = now - timedelta(days=60)
        recent_pmts = db.scalars(
            select(Payment).where(
                and_(
                    Payment.customer_id == customer_id,
                    Payment.organization_id == organization_id,
                    Payment.status == "cleared",
                    Payment.created_at >= sixty_days_ago,
                )
            )
        ).all()

        if recent_pmts:
            spend_score = Decimal("95.00")
            spend_interp = f"Active paid transactions ({len(recent_pmts)} cleared payments in last 60d)"
        else:
            spend_score = Decimal("50.00")
            spend_interp = "No recent payments recorded in last 60d"

        spend_impact = (spend_score * Decimal("0.20")).quantize(Decimal("0.01"))
        factors.append(
            FactorDetail(
                factor_name="Spend Recency",
                weight=Decimal("0.20"),
                observed_value=f"{len(recent_pmts)} cleared payments in 60d",
                score_impact=spend_impact,
                interpretation=spend_interp,
            )
        )

        # Compute aggregate score
        raw_total = sum((f.score_impact for f in factors), Decimal("0.00"))
        final_score = max(Decimal("0.00"), min(Decimal("100.00"), raw_total)).quantize(Decimal("0.01"))

        if final_score >= Decimal("85.00"):
            risk_category = "healthy"
            retention_guidance = "Account is thriving. Identify expansion opportunities and advocate for annual commit."
        elif final_score >= Decimal("65.00"):
            risk_category = "moderate_risk"
            retention_guidance = "Standard account health. Monitor feature adoption and ensure upcoming invoices are settled."
        elif final_score >= Decimal("40.00"):
            risk_category = "high_risk"
            retention_guidance = "High churn warning. Customer shows low utilization or payment delays. Schedule customer success review."
        else:
            risk_category = "critical"
            retention_guidance = "Critical retention alert! High probability of cancellation or default. Immediate executive outreach required."

        # Persist record in database
        score_record = RevenueHealthScore(
            organization_id=organization_id,
            customer_id=customer_id,
            score=final_score,
            risk_category=risk_category,
            factors_json=json.dumps([f.model_dump() for f in factors], default=str),
            factor_weights_json=json.dumps({f.factor_name: str(f.weight) for f in factors}),
            missing_signals_json=json.dumps(missing_signals),
            retention_guidance=retention_guidance,
            calculation_version=cls.CALCULATION_VERSION,
        )
        db.add(score_record)
        db.commit()

        return RevenueHealthScoreResponse(
            customer_id=customer_id,
            score=final_score,
            risk_category=risk_category,
            retention_guidance=retention_guidance,
            factors=factors,
            missing_signals=missing_signals,
            calculation_version=cls.CALCULATION_VERSION,
            calculated_at=score_record.calculated_at,
        )

