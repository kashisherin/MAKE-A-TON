from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.financial import (
    UtilizationRecord,
    PulseRecommendation,
    utc_now,
)
from app.schemas.pulse import PulseRecommendationResponse
from app.services.money import money, CENT


class PulseRecommendationEngine:
    @classmethod
    def generate_recommendations(
        cls,
        db: Session,
        organization_id: str,
        unit_license_cost: Decimal = Decimal("500.00"),
    ) -> list[PulseRecommendation]:
        records = db.scalars(
            select(UtilizationRecord).where(
                UtilizationRecord.organization_id == organization_id
            ).order_by(UtilizationRecord.id.desc())
        ).all()

        recommendations: list[PulseRecommendation] = []
        seen_subscriptions: set[str] = set()

        for rec in records:
            if rec.subscription_id in seen_subscriptions:
                continue
            seen_subscriptions.add(rec.subscription_id)

            unused = max(0, rec.purchased_units - rec.actually_used_units)
            utilization_pct = rec.utilization_percentage

            # 1. Underutilization / Right-size recommendation
            if unused >= 5 and utilization_pct < Decimal("70.00"):
                savings = (Decimal(str(unused)) * unit_license_cost).quantize(CENT)
                rec_entity = PulseRecommendation(
                    organization_id=organization_id,
                    customer_id=rec.customer_id,
                    subscription_id=rec.subscription_id,
                    recommendation_type="right_size",
                    reason=f"Significant unused license capacity ({unused} idle seats)",
                    evidence_summary=(
                        f"Customer is paying for {rec.purchased_units} licenses but only "
                        f"{rec.actually_used_units} were logged as active in the last 30 days."
                    ),
                    estimated_financial_impact=savings,
                    confidence_score=Decimal("0.92"),
                    suggested_action=f"Reduce subscription license count from {rec.purchased_units} to {rec.actually_used_units + 2} seats.",
                    renewal_date=datetime.now(timezone.utc) + timedelta(days=30),
                    status="open",
                )
                db.add(rec_entity)
                recommendations.append(rec_entity)

            # 2. High utilization / Capacity warning
            elif utilization_pct >= Decimal("95.00"):
                rec_entity = PulseRecommendation(
                    organization_id=organization_id,
                    customer_id=rec.customer_id,
                    subscription_id=rec.subscription_id,
                    recommendation_type="upgrade",
                    reason="Subscription near capacity (>95% utilization)",
                    evidence_summary=(
                        f"Customer has consumed {rec.actually_used_units} of {rec.purchased_units} seats. "
                        f"Team expansion may be blocked."
                    ),
                    estimated_financial_impact=Decimal("0.00"),
                    confidence_score=Decimal("0.96"),
                    suggested_action="Proactively offer seat expansion tier before renewal.",
                    renewal_date=datetime.now(timezone.utc) + timedelta(days=15),
                    status="open",
                )
                db.add(rec_entity)
                recommendations.append(rec_entity)

            # 3. Healthy renewal
            elif utilization_pct >= Decimal("75.00"):
                rec_entity = PulseRecommendation(
                    organization_id=organization_id,
                    customer_id=rec.customer_id,
                    subscription_id=rec.subscription_id,
                    recommendation_type="renew",
                    reason="Healthy usage and steady adoption",
                    evidence_summary=(
                        f"Consistent {utilization_pct}% utilization with {rec.actually_used_units} active seats."
                    ),
                    estimated_financial_impact=Decimal("0.00"),
                    confidence_score=Decimal("0.88"),
                    suggested_action="Engage customer for annual commitment renewal discount.",
                    renewal_date=datetime.now(timezone.utc) + timedelta(days=20),
                    status="open",
                )
                db.add(rec_entity)
                recommendations.append(rec_entity)

        db.commit()
        for r in recommendations:
            db.refresh(r)
        return recommendations

