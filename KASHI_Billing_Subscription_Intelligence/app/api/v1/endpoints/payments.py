from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.api.deps import get_tenant_context, require_role
from app.core.security import TenantContext, UserRole
from app.models.financial import Payment
from app.schemas.payments import (
    PaymentCreate,
    PaymentResponse,
    RefundCreate,
    RefundResponse,
    ReconciliationInput,
    ReconciliationResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter()


@router.post("/", response_model=PaymentResponse, status_code=201)
def record_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return PaymentService.record_payment(db=db, data=data, ctx=ctx)


@router.get("/", response_model=list[PaymentResponse])
def list_payments(
    customer_id: str | None = None,
    status: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [Payment.organization_id == ctx.organization_id]
    if customer_id:
        conditions.append(Payment.customer_id == customer_id)
    if status:
        conditions.append(Payment.status == status)

    stmt = select(Payment).where(and_(*conditions)).order_by(Payment.id.desc()).offset(skip).limit(limit)
    payments = db.scalars(stmt).all()
    return list(payments)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    pmt = db.scalar(
        select(Payment).where(
            and_(
                Payment.id == payment_id,
                Payment.organization_id == ctx.organization_id,
            )
        )
    )
    if not pmt:
        raise HTTPException(status_code=404, detail="Payment not found")
    return pmt


@router.post("/{payment_id}/refund", response_model=RefundResponse)
def refund_payment(
    payment_id: int,
    data: RefundCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.ADMIN.value)),
):
    return PaymentService.record_refund(db=db, payment_id=payment_id, data=data, ctx=ctx)


@router.post("/reconcile", response_model=ReconciliationResponse)
def reconcile_payments(
    data: ReconciliationInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return PaymentService.reconcile_payments(db=db, data=data, ctx=ctx)
