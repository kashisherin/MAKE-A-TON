from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.financial import UtilizationRecord
from app.schemas.pulse import (
    PulseSavingsAnalysisResponse,
    SavingsOpportunity,
)
from app.services.money import money, CENT


class PulseSavingsDetector:
    @classmethod
    def analyze_savings(
        cls,
        db: Session,
        organization_id: str,
        unit_license_cost: Decimal = Decimal("500.00"),  # Default Rs 500/seat/month
    ) -> PulseSavingsAnalysisResponse:
        records = db.scalars(
            select(UtilizationRecord).where(
                UtilizationRecord.organization_id == organization_id
            ).order_by(UtilizationRecord.id.desc())
        ).all()

        opportunities: list[SavingsOpportunity] = []
        seen_subscriptions: set[str] = set()

        monthly_savings_acc = Decimal("0.00")

        for rec in records:
            if rec.subscription_id in seen_subscriptions:
                continue
            seen_subscriptions.add(rec.subscription_id)

            unused_licenses = max(0, rec.purchased_units - rec.actually_used_units)
            if unused_licenses > 0:
                monthly_saving = (Decimal(str(unused_licenses)) * unit_license_cost).quantize(CENT, rounding=ROUND_HALF_UP)
                monthly_savings_acc += monthly_saving

                confidence = Decimal("0.95") if rec.utilization_percentage < Decimal("60.00") else Decimal("0.80")
                opportunities.append(
                    SavingsOpportunity(
                        category="unused_licenses",
                        subscription_id=rec.subscription_id,
                        wasted_units=unused_licenses,
                        unit_cost=unit_license_cost,
                        potential_monthly_savings=monthly_saving,
                        supporting_evidence=(
                            f"{rec.purchased_units} licenses purchased, {rec.assigned_units} assigned, "
                            f"but only {rec.actually_used_units} actively used in observation window "
                            f"({rec.utilization_percentage}% utilization)."
                        ),
                        confidence=confidence,
                    )
                )

        annual_savings = (monthly_savings_acc * Decimal("12.00")).quantize(CENT)
        summary = (
            f"Identified {len(opportunities)} potential cost optimization opportunities across "
            f"{len(seen_subscriptions)} active subscriptions with total potential savings of "
            f"{monthly_savings_acc} INR/month ({annual_savings} INR/year)."
        )

        return PulseSavingsAnalysisResponse(
            organization_id=organization_id,
            total_potential_monthly_savings=monthly_savings_acc,
            total_potential_annual_savings=annual_savings,
            opportunities=opportunities,
            summary=summary,
        )

