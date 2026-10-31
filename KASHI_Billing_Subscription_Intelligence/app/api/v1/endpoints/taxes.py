from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.deps import get_tenant_context, require_role
from app.core.security import TenantContext, UserRole
from app.models.financial import TaxRule
from app.schemas.taxes import (
    TaxRuleCreate,
    TaxRuleResponse,
    TaxCalculationPreviewInput,
    TaxCalculationPreviewResponse,
    TaxBreakdownItem,
)
from app.domain.taxation.engine import TaxEngine
from app.domain.audit.service import AuditService

router = APIRouter()


@router.post("/", response_model=TaxRuleResponse, status_code=201)
def create_tax_rule(
    data: TaxRuleCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.ADMIN.value)),
):
    rule = TaxRule(
        organization_id=data.organization_id or ctx.organization_id,
        name=data.name,
        code=data.code.upper(),
        rate_percent=data.rate_percent,
        is_inclusive=data.is_inclusive,
        jurisdiction_country=data.jurisdiction_country.upper(),
        jurisdiction_state=data.jurisdiction_state.upper() if data.jurisdiction_state else None,
        product_category=data.product_category,
        is_active=data.is_active,
    )
    db.add(rule)
    db.flush()

    AuditService.record_event(
        db=db,
        entity_type="TaxRule",
        entity_id=str(rule.id),
        action="CREATE_TAX_RULE",
        actor_id=ctx.actor_id,
        organization_id=ctx.organization_id,
        after_state={"name": rule.name, "code": rule.code, "rate": str(rule.rate_percent)},
    )
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/", response_model=list[TaxRuleResponse])
def list_tax_rules(
    country: str | None = None,
    is_active: bool | None = True,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [TaxRule.organization_id == ctx.organization_id]
    if country:
        conditions.append(TaxRule.jurisdiction_country == country.upper())
    if is_active is not None:
        conditions.append(TaxRule.is_active == is_active)

    rules = db.scalars(select(TaxRule).where(and_(*conditions)).order_by(TaxRule.id.asc())).all()
    return list(rules)


@router.post("/calculate", response_model=TaxCalculationPreviewResponse)
def calculate_tax_preview(
    data: TaxCalculationPreviewInput,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    # Find matching active tax rule
    rule = db.scalar(
        select(TaxRule).where(
            and_(
                TaxRule.is_active.is_(True),
                TaxRule.jurisdiction_country == data.country.upper(),
            )
        )
    )
    rate = rule.rate_percent if rule else Decimal("18.0000")

    taxable_subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    breakdown_map: dict[str, TaxBreakdownItem] = {}

    for line in data.lines:
        res = TaxEngine.calculate_line_tax(
            line_subtotal=line.amount,
            discount_amount=Decimal("0.00"),
            applicable_rate_percent=rate,
            is_inclusive=False,
            is_exempt=data.is_exempt,
            place_of_supply=data.place_of_supply,
            supplier_state=data.supplier_state,
            jurisdiction_country=data.country,
        )
        taxable_subtotal += res.taxable_subtotal
        total_tax += res.tax_total

        for comp in res.components:
            if comp.tax_code not in breakdown_map:
                breakdown_map[comp.tax_code] = TaxBreakdownItem(
                    name=comp.tax_name,
                    code=comp.tax_code,
                    rate_percent=comp.rate_percent,
                    taxable_amount=comp.taxable_amount,
                    tax_amount=comp.tax_amount,
                )
            else:
                existing = breakdown_map[comp.tax_code]
                breakdown_map[comp.tax_code] = TaxBreakdownItem(
                    name=existing.name,
                    code=existing.code,
                    rate_percent=existing.rate_percent,
                    taxable_amount=existing.taxable_amount + comp.taxable_amount,
                    tax_amount=existing.tax_amount + comp.tax_amount,
                )

    return TaxCalculationPreviewResponse(
        taxable_subtotal=taxable_subtotal,
        tax_total=total_tax,
        grand_total=taxable_subtotal + total_tax,
        breakdowns=list(breakdown_map.values()),
    )

