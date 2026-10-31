from datetime import datetime
from pydantic import BaseModel, Field


class EntitlementGrantInput(BaseModel):
    customer_id: str
    feature_key: str
    name: str
    organization_id: str | None = None
    duration_hours: int | None = None  # For micro-subscriptions (e.g. 1 hour, 24 hours, 168 hours)
    expires_at: datetime | None = None
    max_usage_limit: int | None = None


class EntitlementResponse(BaseModel):
    id: int
    organization_id: str | None
    customer_id: str
    feature_key: str
    name: str
    status: str
    granted_at: datetime
    expires_at: datetime | None
    max_usage_limit: int | None
    current_usage_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EntitlementVerifyResponse(BaseModel):
    is_entitled: bool
    feature_key: str
    customer_id: str
    status: str
    expires_at: datetime | None
    remaining_usage: int | None
    reason: str | None = None

