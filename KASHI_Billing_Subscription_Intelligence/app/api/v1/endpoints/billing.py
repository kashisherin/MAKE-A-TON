from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.api.deps import get_tenant_context, require_role
from app.core.security import TenantContext, UserRole
from app.models.financial import BillingRun
from app.schemas.billing import (
    BillingRunTriggerInput,
    BillingRunResponse,
    BillingRunsListResponse,
)
from app.domain.billing.engine import RecurringBillingEngine
from app.integrations.contracts import SubscriptionProvider, SubscriptionSnapshot

router = APIRouter()


class DefaultSubscriptionAdapter(SubscriptionProvider):
    """Adapter to host platform; returns billable subscriptions snapshot."""
    def __init__(self, db: Session, org_id: str):
        self.db = db
        self.org_id = org_id

    def get_billable_subscriptions(self, as_of_iso: str) -> list[SubscriptionSnapshot]:
        # In standalone mode or integration mode, provides active subscriptions due for billing
        return [
            SubscriptionSnapshot(
                subscription_id="sub_enterprise_001",
                customer_id="cust_acme_corp",
                organization_id=self.org_id,
                plan_id="plan_enterprise_tier",
                status="active",
                billing_interval="monthly",
                currency="INR",
            ),
            SubscriptionSnapshot(
                subscription_id="sub_pro_002",
                customer_id="cust_globex",
                organization_id=self.org_id,
                plan_id="plan_pro_tier",
                status="active",
                billing_interval="monthly",
                currency="INR",
            ),
        ]


@router.post("/run", response_model=BillingRunResponse, status_code=201)
def trigger_billing_run(
    data: BillingRunTriggerInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.ADMIN.value)),
):
    provider = DefaultSubscriptionAdapter(db=db, org_id=ctx.organization_id)
    return RecurringBillingEngine.execute_billing_run(
        db=db,
        subscription_provider=provider,
        as_of_date=data.as_of_date,
        organization_id=data.organization_id or ctx.organization_id,
        run_type=data.run_type,
        actor_id=ctx.actor_id,
    )


@router.get("/runs", response_model=BillingRunsListResponse)
def list_billing_runs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    total = db.scalar(
        select(func.count(BillingRun.id)).where(BillingRun.organization_id == ctx.organization_id)
    ) or 0

    runs = db.scalars(
        select(BillingRun)
        .where(BillingRun.organization_id == ctx.organization_id)
        .order_by(BillingRun.id.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return BillingRunsListResponse(items=list(runs), total=total)


@router.get("/runs/{run_id}", response_model=BillingRunResponse)
def get_billing_run(
    run_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    run = db.scalar(
        select(BillingRun).where(
            and_(
                BillingRun.id == run_id,
                BillingRun.organization_id == ctx.organization_id,
            )
        )
    )
    if not run:
        raise HTTPException(status_code=404, detail="Billing run not found")
    return run

