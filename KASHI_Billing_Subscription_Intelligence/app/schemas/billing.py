from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class BillingRunTriggerInput(BaseModel):
    as_of_date: datetime | None = None
    organization_id: str | None = None
    run_type: str = Field(default="manual", pattern="^(scheduled|manual|retry)$")


class BillingEventResponse(BaseModel):
    id: int
    subscription_id: str
    customer_id: str
    status: str
    invoice_id: int | None
    retry_count: int
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BillingRunResponse(BaseModel):
    id: int
    organization_id: str | None
    run_type: str
    status: str
    started_at: datetime
    completed_at: datetime | None
    total_subscriptions_evaluated: int
    invoices_generated: int
    total_billed_amount: Decimal
    errors_count: int
    error_summary: str | None
    events: list[BillingEventResponse] = []

    model_config = {"from_attributes": True}


class BillingRunsListResponse(BaseModel):
    items: list[BillingRunResponse]
    total: int

