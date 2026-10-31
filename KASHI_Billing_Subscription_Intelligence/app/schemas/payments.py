from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class PaymentAllocationInput(BaseModel):
    invoice_id: int
    amount: Decimal = Field(gt=Decimal("0.00"))


class PaymentCreate(BaseModel):
    customer_id: str
    organization_id: str | None = None
    invoice_id: int | None = None  # Single invoice or empty if allocating via allocations list
    amount: Decimal = Field(gt=Decimal("0.00"))
    currency: str = Field(default="INR", min_length=3, max_length=3)
    method: str = Field(default="card")  # card, upi, netbanking, wallet, bank_transfer
    provider_reference: str | None = None
    idempotency_key: str = Field(min_length=1, max_length=200)
    allocations: list[PaymentAllocationInput] = Field(default_factory=list)


class PaymentAllocationResponse(BaseModel):
    id: int
    invoice_id: int
    amount: Decimal
    allocated_at: datetime

    model_config = {"from_attributes": True}


class RefundResponse(BaseModel):
    id: int
    payment_id: int
    amount: Decimal
    currency: str
    reason: str | None
    provider_refund_reference: str | None
    idempotency_key: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentResponse(BaseModel):
    id: int
    organization_id: str | None
    customer_id: str
    invoice_id: int | None
    amount: Decimal
    currency: str
    method: str
    status: str
    provider_reference: str | None
    idempotency_key: str
    created_at: datetime
    allocations: list[PaymentAllocationResponse] = []
    refunds: list[RefundResponse] = []

    model_config = {"from_attributes": True}


class RefundCreate(BaseModel):
    amount: Decimal = Field(gt=Decimal("0.00"))
    reason: str | None = None
    idempotency_key: str = Field(min_length=1, max_length=200)
    provider_refund_reference: str | None = None


class ReconciliationItem(BaseModel):
    provider_reference: str
    expected_amount: Decimal
    provider_status: str


class ReconciliationInput(BaseModel):
    items: list[ReconciliationItem]


class ReconciliationDiscrepancy(BaseModel):
    provider_reference: str
    system_payment_id: int | None
    system_status: str | None
    system_amount: Decimal | None
    provider_status: str
    provider_amount: Decimal
    issue: str


class ReconciliationResponse(BaseModel):
    total_checked: int
    matched_count: int
    discrepancies: list[ReconciliationDiscrepancy]

