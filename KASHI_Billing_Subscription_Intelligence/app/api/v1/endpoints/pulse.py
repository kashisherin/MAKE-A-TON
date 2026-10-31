from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.deps import get_tenant_context, require_role
from app.core.security import TenantContext, UserRole
from app.models.financial import UtilizationRecord, PulseRecommendation
from app.schemas.pulse import (
    UtilizationRecordResponse,
    PulseSavingsAnalysisResponse,
    PulseRecommendationResponse,
    RevenueHealthScoreResponse,
)
from app.domain.pulse.utilization import PulseUtilizationTracker
from app.domain.pulse.savings import PulseSavingsDetector
from app.domain.pulse.recommendations import PulseRecommendationEngine
from app.domain.pulse.health_score import RevenueHealthScoreEngine

router = APIRouter()


@router.post("/utilization", response_model=UtilizationRecordResponse, status_code=201)
def record_utilization(
    subscription_id: str,
    customer_id: str,
    purchased_units: int,
    assigned_units: int,
    active_units: int,
    actually_used_units: int,
    observation_days: int = 30,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    rec = PulseUtilizationTracker.record_utilization_snapshot(
        db=db,
        subscription_id=subscription_id,
        customer_id=customer_id,
        purchased_units=purchased_units,
        assigned_units=assigned_units,
        active_units=active_units,
        actually_used_units=actually_used_units,
        observation_days=observation_days,
        organization_id=ctx.organization_id,
    )
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


@router.get("/utilization", response_model=list[UtilizationRecordResponse])
def list_utilization(
    subscription_id: str | None = None,
    customer_id: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [UtilizationRecord.organization_id == ctx.organization_id]
    if subscription_id:
        conditions.append(UtilizationRecord.subscription_id == subscription_id)
    if customer_id:
        conditions.append(UtilizationRecord.customer_id == customer_id)

    records = db.scalars(
        select(UtilizationRecord).where(and_(*conditions)).order_by(UtilizationRecord.id.desc())
    ).all()

    resp = []
    for r in records:
        resp.append(
            UtilizationRecordResponse(
                id=r.id,
                subscription_id=r.subscription_id,
                customer_id=r.customer_id,
                observation_period_start=r.observation_period_start,
                observation_period_end=r.observation_period_end,
                purchased_units=r.purchased_units,
                assigned_units=r.assigned_units,
                active_units=r.active_units,
                actually_used_units=r.actually_used_units,
                unused_units=max(0, r.purchased_units - r.actually_used_units),
                utilization_percentage=r.utilization_percentage,
                recorded_at=r.recorded_at,
            )
        )
    return resp


@router.get("/savings", response_model=PulseSavingsAnalysisResponse)
def get_savings_analysis(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return PulseSavingsDetector.analyze_savings(
        db=db,
        organization_id=ctx.organization_id,
    )


@router.post("/recommendations/generate", response_model=list[PulseRecommendationResponse])
def generate_recommendations(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    recs = PulseRecommendationEngine.generate_recommendations(
        db=db,
        organization_id=ctx.organization_id,
    )
    return recs


@router.get("/recommendations", response_model=list[PulseRecommendationResponse])
def list_recommendations(
    customer_id: str | None = None,
    subscription_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [PulseRecommendation.organization_id == ctx.organization_id]
    if customer_id:
        conditions.append(PulseRecommendation.customer_id == customer_id)
    if subscription_id:
        conditions.append(PulseRecommendation.subscription_id == subscription_id)
    if status:
        conditions.append(PulseRecommendation.status == status)

    recs = db.scalars(
        select(PulseRecommendation).where(and_(*conditions)).order_by(PulseRecommendation.id.desc())
    ).all()
    return list(recs)


@router.get("/health-score/{customer_id}", response_model=RevenueHealthScoreResponse)
def get_health_score(
    customer_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return RevenueHealthScoreEngine.calculate_health_score(
        db=db,
        customer_id=customer_id,
        organization_id=ctx.organization_id,
    )
