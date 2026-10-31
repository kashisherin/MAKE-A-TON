from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class UtilizationRecordResponse(BaseModel):
    id: int
    subscription_id: str
    customer_id: str
    observation_period_start: datetime
    observation_period_end: datetime
    purchased_units: int
    assigned_units: int
    active_units: int
    actually_used_units: int
    unused_units: int
    utilization_percentage: Decimal
    recorded_at: datetime

    model_config = {"from_attributes": True}


class SavingsOpportunity(BaseModel):
    category: str  # "unused_licenses", "underutilized_tier", "duplicate_add_on"
    subscription_id: str
    wasted_units: int
    unit_cost: Decimal
    potential_monthly_savings: Decimal
    supporting_evidence: str
    confidence: Decimal


class PulseSavingsAnalysisResponse(BaseModel):
    organization_id: str | None
    total_potential_monthly_savings: Decimal
    total_potential_annual_savings: Decimal
    opportunities: list[SavingsOpportunity]
    summary: str


class PulseRecommendationResponse(BaseModel):
    id: int
    subscription_id: str
    customer_id: str
    recommendation_type: str
    reason: str
    evidence_summary: str
    estimated_financial_impact: Decimal
    confidence_score: Decimal
    suggested_action: str
    renewal_date: datetime | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FactorDetail(BaseModel):
    factor_name: str
    weight: Decimal
    observed_value: str
    score_impact: Decimal
    interpretation: str


class RevenueHealthScoreResponse(BaseModel):
    customer_id: str
    score: Decimal
    risk_category: str
    retention_guidance: str
    factors: list[FactorDetail]
    missing_signals: list[str]
    calculation_version: str
    calculated_at: datetime

