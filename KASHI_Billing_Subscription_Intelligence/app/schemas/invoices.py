from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class InvoiceLineCreate(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    product_id: str | None = None
    plan_id: str | None = None
    quantity: Decimal = Field(default=Decimal("1.0000"), gt=Decimal("0"))
    unit_price: Decimal = Field(gt=Decimal("0"))
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class InvoiceCreate(BaseModel):
    customer_id: str = Field(min_length=1)
    organization_id: str | None = None
    subscription_id: str | None = None
    billing_period_start: datetime | None = None
    billing_period_end: datetime | None = None
    currency: str = Field(default="INR", min_length=3, max_length=3)
    due_at: datetime | None = None
    notes: str | None = None
    customer_address: str | None = None
    place_of_supply: str | None = None  # State code, e.g., "KA", "MH"
    customer_tax_id: str | None = None  # GSTIN
    discount_code: str | None = None
    lines: list[InvoiceLineCreate] = Field(default_factory=list)


class InvoiceTaxBreakdownResponse(BaseModel):
    id: int
    tax_name: str
    tax_code: str
    rate_percent: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal

    model_config = {"from_attributes": True}


class InvoiceLineResponse(BaseModel):
    id: int
    description: str
    product_id: str | None
    plan_id: str | None
    quantity: Decimal
    unit_price: Decimal
    line_subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: str
    organization_id: str | None
    subscription_id: str | None
    billing_period_start: datetime | None
    billing_period_end: datetime | None
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    status: str
    due_at: datetime | None
    issued_at: datetime | None
    finalized_at: datetime | None
    voided_at: datetime | None
    notes: str | None
    customer_address: str | None
    place_of_supply: str | None
    customer_tax_id: str | None
    created_at: datetime
    lines: list[InvoiceLineResponse] = []
    tax_breakdowns: list[InvoiceTaxBreakdownResponse] = []

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int

