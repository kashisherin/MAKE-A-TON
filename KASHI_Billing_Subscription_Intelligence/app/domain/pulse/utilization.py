from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.financial import UtilizationRecord, utc_now
from app.schemas.pulse import UtilizationRecordResponse


class PulseUtilizationTracker:
    @classmethod
    def record_utilization_snapshot(
        cls,
        db: Session,
        subscription_id: str,
        customer_id: str,
        purchased_units: int,
        assigned_units: int,
        active_units: int,
        actually_used_units: int,
        observation_days: int = 30,
        organization_id: str | None = None,
    ) -> UtilizationRecord:
        now = datetime.now(timezone.utc)
        period_start = now - timedelta(days=observation_days)

        if purchased_units <= 0:
            utilization_pct = Decimal("0.00")
        else:
            pct = (Decimal(str(actually_used_units)) / Decimal(str(purchased_units))) * Decimal("100.00")
            utilization_pct = pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        record = UtilizationRecord(
            organization_id=organization_id or "org_default",
            subscription_id=subscription_id,
            customer_id=customer_id,
            observation_period_start=period_start,
            observation_period_end=now,
            purchased_units=purchased_units,
            assigned_units=assigned_units,
            active_units=active_units,
            actually_used_units=actually_used_units,
            utilization_percentage=utilization_pct,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @classmethod
    def get_latest_utilization(
        cls,
        db: Session,
        subscription_id: str,
        organization_id: str,
    ) -> UtilizationRecordResponse | None:
        rec = db.scalar(
            select(UtilizationRecord).where(
                and_(
                    UtilizationRecord.subscription_id == subscription_id,
                    UtilizationRecord.organization_id == organization_id,
                )
            ).order_by(UtilizationRecord.id.desc())
        )
        if not rec:
            return None

        unused_units = max(0, rec.purchased_units - rec.actually_used_units)
        return UtilizationRecordResponse(
            id=rec.id,
            subscription_id=rec.subscription_id,
            customer_id=rec.customer_id,
            observation_period_start=rec.observation_period_start,
            observation_period_end=rec.observation_period_end,
            purchased_units=rec.purchased_units,
            assigned_units=rec.assigned_units,
            active_units=rec.active_units,
            actually_used_units=rec.actually_used_units,
            unused_units=unused_units,
            utilization_percentage=rec.utilization_percentage,
            recorded_at=rec.recorded_at,
        )

