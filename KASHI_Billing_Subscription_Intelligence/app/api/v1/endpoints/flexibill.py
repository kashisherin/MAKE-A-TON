from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.api.deps import get_tenant_context, require_role
from app.core.security import TenantContext, UserRole
from app.models.financial import (
    Wallet,
    WalletTransaction,
    UsagePricingRule,
    UsageEvent,
    Entitlement,
)
from app.schemas.wallets import (
    WalletCreate,
    WalletResponse,
    WalletCreditInput,
    WalletDebitInput,
    WalletTransactionResponse,
    WalletReconciliationResponse,
)
from app.schemas.usage import (
    UsagePricingRuleCreate,
    UsagePricingRuleResponse,
    UsageEventIngestInput,
    UsageEventResponse,
    ConsumptionOptimizationResponse,
)
from app.schemas.entitlements import (
    EntitlementGrantInput,
    EntitlementResponse,
    EntitlementVerifyResponse,
)
from app.domain.wallet.service import WalletService
from app.domain.usage.service import UsageBillingService
from app.domain.entitlements.service import EntitlementService
from app.domain.consumption.optimizer import SmartConsumptionOptimizer

router = APIRouter()


# ---------------------------------------------------------------------------
# Wallet Endpoints
# ---------------------------------------------------------------------------
@router.post("/wallets", response_model=WalletResponse, status_code=201)
def create_wallet(
    data: WalletCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    wallet = WalletService.get_or_create_wallet(
        db=db,
        customer_id=data.customer_id,
        organization_id=data.organization_id or ctx.organization_id,
        currency=data.currency,
        spending_limit=data.spending_limit,
    )
    return wallet


@router.get("/wallets", response_model=list[WalletResponse])
def list_wallets(
    customer_id: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [Wallet.organization_id == ctx.organization_id]
    if customer_id:
        conditions.append(Wallet.customer_id == customer_id)

    stmt = select(Wallet).where(and_(*conditions)).offset(skip).limit(limit)
    wallets = db.scalars(stmt).all()
    return list(wallets)


@router.get("/wallets/{wallet_id}", response_model=WalletResponse)
def get_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    wallet = db.scalar(
        select(Wallet).where(
            and_(
                Wallet.id == wallet_id,
                Wallet.organization_id == ctx.organization_id,
            )
        )
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    recent_txs = db.scalars(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.id.desc())
        .limit(20)
    ).all()

    resp = WalletResponse.model_validate(wallet)
    resp.recent_transactions = [WalletTransactionResponse.model_validate(tx) for tx in recent_txs]
    return resp


@router.post("/wallets/{wallet_id}/credit", response_model=WalletTransactionResponse)
def credit_wallet(
    wallet_id: int,
    data: WalletCreditInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return WalletService.credit_wallet(db=db, wallet_id=wallet_id, data=data, ctx=ctx)


@router.post("/wallets/{wallet_id}/debit", response_model=WalletTransactionResponse)
def debit_wallet(
    wallet_id: int,
    data: WalletDebitInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return WalletService.debit_wallet(db=db, wallet_id=wallet_id, data=data, ctx=ctx)


@router.get("/wallets/{wallet_id}/reconcile", response_model=WalletReconciliationResponse)
def reconcile_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.AUDITOR.value)),
):
    return WalletService.reconcile_wallet(db=db, wallet_id=wallet_id, ctx=ctx)


# ---------------------------------------------------------------------------
# Usage Endpoints
# ---------------------------------------------------------------------------
@router.post("/usage/rules", response_model=UsagePricingRuleResponse, status_code=201)
def create_usage_pricing_rule(
    data: UsagePricingRuleCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.ADMIN.value)),
):
    rule = UsagePricingRule(
        organization_id=data.organization_id or ctx.organization_id,
        product_id=data.product_id,
        metric_name=data.metric_name,
        model_type=data.model_type,
        unit_price=data.unit_price,
        tiers_json=data.tiers_json,
        currency=data.currency.upper(),
        is_active=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/usage/rules", response_model=list[UsagePricingRuleResponse])
def list_usage_pricing_rules(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    rules = db.scalars(
        select(UsagePricingRule).where(UsagePricingRule.organization_id == ctx.organization_id)
    ).all()
    return list(rules)


@router.post("/usage/events", response_model=UsageEventResponse, status_code=201)
def ingest_usage_event(
    data: UsageEventIngestInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return UsageBillingService.ingest_event(db=db, data=data, ctx=ctx)


@router.get("/usage/events", response_model=list[UsageEventResponse])
def list_usage_events(
    customer_id: str | None = None,
    metric_name: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [UsageEvent.organization_id == ctx.organization_id]
    if customer_id:
        conditions.append(UsageEvent.customer_id == customer_id)
    if metric_name:
        conditions.append(UsageEvent.metric_name == metric_name)

    stmt = select(UsageEvent).where(and_(*conditions)).order_by(UsageEvent.id.desc()).offset(skip).limit(limit)
    events = db.scalars(stmt).all()
    return list(events)


@router.post("/usage/optimize", response_model=ConsumptionOptimizationResponse)
def optimize_consumption(
    customer_id: str,
    metric_name: str = "api_calls",
    average_monthly_quantity: Decimal = Decimal("10000.0000"),
    current_model: str = "Pay-As-You-Go",
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    # Lookup configured base rate if available
    rule = db.scalar(
        select(UsagePricingRule).where(
            and_(
                UsagePricingRule.metric_name == metric_name,
                UsagePricingRule.is_active.is_(True),
            )
        )
    )
    unit_price = rule.unit_price if rule else Decimal("0.0500")

    return SmartConsumptionOptimizer.optimize_consumption(
        customer_id=customer_id,
        metric_name=metric_name,
        average_monthly_quantity=average_monthly_quantity,
        base_unit_price=unit_price,
        current_model=current_model,
    )


# ---------------------------------------------------------------------------
# Digital Entitlements Endpoints
# ---------------------------------------------------------------------------
@router.post("/entitlements", response_model=EntitlementResponse, status_code=201)
def grant_entitlement(
    data: EntitlementGrantInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return EntitlementService.grant_entitlement(db=db, data=data, ctx=ctx)


@router.get("/entitlements", response_model=list[EntitlementResponse])
def list_entitlements(
    customer_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [Entitlement.organization_id == ctx.organization_id]
    if customer_id:
        conditions.append(Entitlement.customer_id == customer_id)
    if status:
        conditions.append(Entitlement.status == status)

    entitlements = db.scalars(select(Entitlement).where(and_(*conditions))).all()
    return list(entitlements)


@router.get("/entitlements/{feature_key}/verify", response_model=EntitlementVerifyResponse)
def verify_entitlement(
    feature_key: str,
    customer_id: str = Query(...),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    return EntitlementService.verify_entitlement(
        db=db,
        customer_id=customer_id,
        feature_key=feature_key,
        organization_id=ctx.organization_id,
    )
