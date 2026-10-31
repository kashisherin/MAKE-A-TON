from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.core.security import TenantContext
from app.schemas.analytics import (
    RevenueMetricsResponse,
    OutstandingMetricsResponse,
    CollectionsTrendResponse,
    WalletLiabilitiesResponse,
)
from app.services.analytics_service import FinanceAnalyticsService
from app.domain.overdue.engine import OverdueManagementEngine

router = APIRouter()


@router.get("/revenue", response_model=RevenueMetricsResponse)
def get_revenue_metrics(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return FinanceAnalyticsService.get_revenue_metrics(
        db=db,
        organization_id=ctx.organization_id,
    )


@router.get("/outstanding", response_model=OutstandingMetricsResponse)
def get_outstanding_aging(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return OverdueManagementEngine.get_aging_analysis(
        db=db,
        organization_id=ctx.organization_id,
    )


@router.get("/collections", response_model=CollectionsTrendResponse)
def get_collections_trend(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return FinanceAnalyticsService.get_collections_trend(
        db=db,
        organization_id=ctx.organization_id,
    )


@router.get("/wallet-liabilities", response_model=WalletLiabilitiesResponse)
def get_wallet_liabilities(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return FinanceAnalyticsService.get_wallet_liabilities(
        db=db,
        organization_id=ctx.organization_id,
    )


@router.get("/reliability/{customer_id}")
def get_customer_payment_reliability(
    customer_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return OverdueManagementEngine.calculate_customer_reliability_score(
        db=db,
        customer_id=customer_id,
        organization_id=ctx.organization_id,
    )
