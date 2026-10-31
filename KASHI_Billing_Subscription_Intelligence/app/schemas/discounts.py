from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class DiscountCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    description: str | None = None
    discount_type: str = Field(pattern="^(percentage|fixed)$")
    value: Decimal = Field(gt=Decimal("0.00"))
    min_order_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    max_discount_amount: Decimal | None = None
    max_redemptions: int | None = Field(default=None, gt=0)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    product_id: str | None = None
    plan_id: str | None = None
    organization_id: str | None = None
    is_active: bool = True


class DiscountResponse(BaseModel):
    id: int
    organization_id: str | None
    code: str
    description: str | None
    discount_type: str
    value: Decimal
    min_order_amount: Decimal
    max_discount_amount: Decimal | None
    max_redemptions: int | None
    redemption_count: int
    starts_at: datetime | None
    expires_at: datetime | None
    product_id: str | None
    plan_id: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DiscountValidateInput(BaseModel):
    code: str
    customer_id: str
    order_amount: Decimal = Field(gt=Decimal("0.00"))
    product_id: str | None = None
    plan_id: str | None = None


class DiscountValidateResponse(BaseModel):
    is_valid: bool
    code: str
    discount_type: str | None = None
    discount_amount: Decimal = Decimal("0.00")
    net_order_amount: Decimal = Decimal("0.00")
    rejection_reason: str | None = None

