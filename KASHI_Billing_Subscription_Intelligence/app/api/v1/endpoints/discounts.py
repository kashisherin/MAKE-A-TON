from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.deps import get_tenant_context, require_role
from app.core.security import TenantContext, UserRole
from app.models.financial import Discount
from app.schemas.discounts import (
    DiscountCreate,
    DiscountResponse,
    DiscountValidateInput,
    DiscountValidateResponse,
)
from app.domain.discounts.engine import DiscountEngine
from app.domain.audit.service import AuditService

router = APIRouter()


@router.post("/", response_model=DiscountResponse, status_code=201)
def create_discount(
    data: DiscountCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.ADMIN.value)),
):
    existing = db.scalar(select(Discount).where(Discount.code == data.code.strip()))
    if existing:
        raise HTTPException(status_code=400, detail=f"Discount code '{data.code}' already exists.")

    discount = Discount(
        organization_id=data.organization_id or ctx.organization_id,
        code=data.code.strip().upper(),
        description=data.description,
        discount_type=data.discount_type,
        value=data.value,
        min_order_amount=data.min_order_amount,
        max_discount_amount=data.max_discount_amount,
        max_redemptions=data.max_redemptions,
        starts_at=data.starts_at,
        expires_at=data.expires_at,
        product_id=data.product_id,
        plan_id=data.plan_id,
        is_active=data.is_active,
    )
    db.add(discount)
    db.flush()

    AuditService.record_event(
        db=db,
        entity_type="Discount",
        entity_id=str(discount.id),
        action="CREATE_DISCOUNT",
        actor_id=ctx.actor_id,
        organization_id=ctx.organization_id,
        after_state={"code": discount.code, "type": discount.discount_type, "value": str(discount.value)},
    )
    db.commit()
    db.refresh(discount)
    return discount


@router.get("/", response_model=list[DiscountResponse])
def list_discounts(
    is_active: bool | None = True,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [Discount.organization_id == ctx.organization_id]
    if is_active is not None:
        conditions.append(Discount.is_active == is_active)

    discounts = db.scalars(select(Discount).where(and_(*conditions)).order_by(Discount.id.desc())).all()
    return list(discounts)


@router.post("/validate", response_model=DiscountValidateResponse)
def validate_discount(
    data: DiscountValidateInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    discount = db.scalar(
        select(Discount).where(
            and_(
                Discount.code == data.code.strip().upper(),
                Discount.organization_id == ctx.organization_id,
            )
        )
    )
    if not discount:
        return DiscountValidateResponse(
            is_valid=False,
            code=data.code,
            discount_type=None,
            discount_amount=0,
            net_order_amount=data.order_amount,
            rejection_reason="Invalid or nonexistent discount code.",
        )

    res = DiscountEngine.evaluate_discount(
        discount_type=discount.discount_type,
        discount_value=discount.value,
        order_amount=data.order_amount,
        min_order_amount=discount.min_order_amount,
        max_discount_amount=discount.max_discount_amount,
        max_redemptions=discount.max_redemptions,
        current_redemption_count=discount.redemption_count,
        starts_at=discount.starts_at,
        expires_at=discount.expires_at,
        is_active=discount.is_active,
        eligible_product_id=discount.product_id,
        request_product_id=data.product_id,
        eligible_plan_id=discount.plan_id,
        request_plan_id=data.plan_id,
    )

    net_order = max(0, data.order_amount - res.discount_amount)
    return DiscountValidateResponse(
        is_valid=res.is_valid,
        code=discount.code,
        discount_type=discount.discount_type,
        discount_amount=res.discount_amount,
        net_order_amount=net_order,
        rejection_reason=res.rejection_reason,
    )

