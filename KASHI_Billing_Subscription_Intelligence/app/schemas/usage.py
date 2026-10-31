from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class UsagePricingRuleCreate(BaseModel):
    product_id: str
    metric_name: str
    model_type: str = Field(default="flat", pattern="^(flat|tiered|volume)$")
    unit_price: Decimal = Field(default=Decimal("0.000000"), ge=Decimal("0.000000"))
    tiers_json: str | None = None
    currency: str = Field(default="INR", min_length=3, max_length=3)
    organization_id: str | None = None


class UsagePricingRuleResponse(BaseModel):
    id: int
    product_id: str
    metric_name: str
    model_type: str
    unit_price: Decimal
    tiers_json: str | None
    currency: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UsageEventIngestInput(BaseModel):
    customer_id: str
    metric_name: str
    quantity: Decimal = Field(gt=Decimal("0.0000"))
    idempotency_key: str = Field(min_length=1, max_length=200)
    event_timestamp: datetime | None = None
    organization_id: str | None = None
    auto_debit_wallet: bool = False


class UsageEventResponse(BaseModel):
    id: int
    customer_id: str
    metric_name: str
    quantity: Decimal
    idempotency_key: str
    event_timestamp: datetime
    billed_status: str
    wallet_transaction_id: int | None
    recorded_at: datetime

    model_config = {"from_attributes": True}


class ConsumptionOption(BaseModel):
    model_name: str  # "Pay-As-You-Go", "Prepaid Pack (10k)", "Monthly Tier", "Annual Tier"
    estimated_monthly_cost: Decimal
    effective_unit_cost: Decimal
    breakdown_notes: str


class ConsumptionOptimizationResponse(BaseModel):
    customer_id: str
    metric_name: str
    average_monthly_quantity: Decimal
    current_model: str
    current_estimated_cost: Decimal
    recommended_model: str
    recommended_cost: Decimal
    potential_monthly_savings: Decimal
    savings_percentage: Decimal
    options_evaluated: list[ConsumptionOption]
    explanation: str

