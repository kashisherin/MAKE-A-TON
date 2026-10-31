from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class TaxRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=50)  # e.g. CGST, SGST, IGST, VAT
    rate_percent: Decimal = Field(ge=Decimal("0.0000"), le=Decimal("100.0000"))
    is_inclusive: bool = False
    jurisdiction_country: str = Field(default="IND", min_length=3, max_length=3)
    jurisdiction_state: str | None = None
    product_category: str | None = None
    organization_id: str | None = None
    is_active: bool = True


class TaxRuleResponse(BaseModel):
    id: int
    organization_id: str | None
    name: str
    code: str
    rate_percent: Decimal
    is_inclusive: bool
    jurisdiction_country: str
    jurisdiction_state: str | None
    product_category: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TaxCalculationPreviewLine(BaseModel):
    amount: Decimal = Field(gt=Decimal("0.00"))
    product_category: str | None = None


class TaxCalculationPreviewInput(BaseModel):
    lines: list[TaxCalculationPreviewLine]
    place_of_supply: str | None = None
    supplier_state: str = "KA"
    country: str = "IND"
    is_exempt: bool = False


class TaxBreakdownItem(BaseModel):
    name: str
    code: str
    rate_percent: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal


class TaxCalculationPreviewResponse(BaseModel):
    taxable_subtotal: Decimal
    tax_total: Decimal
    grand_total: Decimal
    breakdowns: list[TaxBreakdownItem]

