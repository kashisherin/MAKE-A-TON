from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Numeric,
    Integer,
    Text,
    Boolean,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TaxRule(Base):
    __tablename__ = "tax_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100))  # e.g., "CGST", "SGST", "IGST", "VAT 20%"
    code: Mapped[str] = mapped_column(String(50), index=True)  # e.g., "CGST", "IGST", "VAT"
    rate_percent: Mapped[Decimal] = mapped_column(Numeric(7, 4))  # e.g., 9.0000 or 18.0000
    is_inclusive: Mapped[bool] = mapped_column(Boolean, default=False)
    jurisdiction_country: Mapped[str] = mapped_column(String(3), default="IND")
    jurisdiction_state: Mapped[str | None] = mapped_column(String(50), nullable=True)  # State code, e.g. "KA", "MH"
    product_category: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Optional category applicability
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class InvoiceTaxBreakdown(Base):
    __tablename__ = "invoice_tax_breakdowns"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    invoice_line_id: Mapped[int | None] = mapped_column(ForeignKey("invoice_lines.id", ondelete="CASCADE"), nullable=True)
    tax_name: Mapped[str] = mapped_column(String(100))
    tax_code: Mapped[str] = mapped_column(String(50))
    rate_percent: Mapped[Decimal] = mapped_column(Numeric(7, 4))
    taxable_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))

    invoice: Mapped["Invoice"] = relationship(back_populates="tax_breakdowns")


class Discount(Base):
    __tablename__ = "discounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    discount_type: Mapped[str] = mapped_column(String(20))  # "percentage" or "fixed"
    value: Mapped[Decimal] = mapped_column(Numeric(18, 2))  # e.g., 20.00 for 20% or 500.00 for flat Rs 500
    min_order_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    max_discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    max_redemptions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    redemption_count: Mapped[int] = mapped_column(Integer, default=0)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    product_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    plan_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DiscountRedemption(Base):
    __tablename__ = "discount_redemptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    discount_id: Mapped[int] = mapped_column(ForeignKey("discounts.id"), index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    amount_applied: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    idempotency_key: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("subscription_id", "billing_period_start", "billing_period_end",
                         name="uq_invoice_subscription_period"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    subscription_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    billing_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    billing_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    discount_total: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    tax_total: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    total: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)  # draft, issued, partially_paid, paid, overdue, void
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    place_of_supply: Mapped[str | None] = mapped_column(String(50), nullable=True)  # State code for GST
    customer_tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. GSTIN
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    lines: Mapped[list["InvoiceLine"]] = relationship(back_populates="invoice", cascade="all, delete-orphan")
    tax_breakdowns: Mapped[list["InvoiceTaxBreakdown"]] = relationship(back_populates="invoice", cascade="all, delete-orphan")
    allocations: Mapped[list["PaymentAllocation"]] = relationship(back_populates="invoice")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    description: Mapped[str] = mapped_column(String(500))
    product_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    plan_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("1"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    invoice: Mapped["Invoice"] = relationship(back_populates="lines")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id"), nullable=True, index=True)  # Primary invoice if single
    provider_reference: Mapped[str | None] = mapped_column(String(200), nullable=True, unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    method: Mapped[str] = mapped_column(String(40))  # "card", "upi", "netbanking", "wallet", "bank_transfer"
    status: Mapped[str] = mapped_column(String(24), default="cleared", index=True)  # "recorded", "cleared", "failed", "refunded"
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    allocations: Mapped[list["PaymentAllocation"]] = relationship(back_populates="payment", cascade="all, delete-orphan")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="payment")


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id", ondelete="CASCADE"), index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    allocated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    payment: Mapped["Payment"] = relationship(back_populates="allocations")
    invoice: Mapped["Invoice"] = relationship(back_populates="allocations")


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_refund_reference: Mapped[str | None] = mapped_column(String(200), nullable=True, unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(24), default="completed", index=True)  # "pending", "completed", "failed"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    payment: Mapped["Payment"] = relationship(back_populates="refunds")


class BillingRun(Base):
    __tablename__ = "billing_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    run_type: Mapped[str] = mapped_column(String(30), default="scheduled")  # "scheduled", "manual", "retry"
    status: Mapped[str] = mapped_column(String(24), default="started", index=True)  # "started", "completed", "failed"
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_subscriptions_evaluated: Mapped[int] = mapped_column(Integer, default=0)
    invoices_generated: Mapped[int] = mapped_column(Integer, default=0)
    total_billed_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    errors_count: Mapped[int] = mapped_column(Integer, default=0)
    error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    events: Mapped[list["BillingEvent"]] = relationship(back_populates="billing_run", cascade="all, delete-orphan")


class BillingEvent(Base):
    __tablename__ = "billing_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    billing_run_id: Mapped[int] = mapped_column(ForeignKey("billing_runs.id", ondelete="CASCADE"), index=True)
    subscription_id: Mapped[str] = mapped_column(String(128), index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    status: Mapped[str] = mapped_column(String(24), index=True)  # "success", "failed", "skipped"
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    billing_run: Mapped["BillingRun"] = relationship(back_populates="events")


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    # Cached balance only. The immutable transaction ledger is the source of truth.
    cached_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    spending_limit: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)  # "active", "frozen", "closed"
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    transactions: Mapped[list["WalletTransaction"]] = relationship(back_populates="wallet", cascade="all, delete-orphan")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    wallet_id: Mapped[int] = mapped_column(ForeignKey("wallets.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    transaction_type: Mapped[str] = mapped_column(String(24))  # "credit", "debit", "refund", "adjustment"
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    balance_after: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    wallet: Mapped["Wallet"] = relationship(back_populates="transactions")


class UsagePricingRule(Base):
    __tablename__ = "usage_pricing_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    product_id: Mapped[str] = mapped_column(String(128), index=True)
    metric_name: Mapped[str] = mapped_column(String(80), index=True)  # e.g. "api_calls", "ai_tokens", "compute_hours"
    model_type: Mapped[str] = mapped_column(String(24), default="flat")  # "flat", "tiered", "volume"
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0.000000"))
    tiers_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON tiers: [{"up_to": 1000, "price": 0.05}, ...]
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    metric_name: Mapped[str] = mapped_column(String(80), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    idempotency_key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    billed_status: Mapped[str] = mapped_column(String(24), default="unbilled", index=True)  # "unbilled", "billed", "waived"
    wallet_transaction_id: Mapped[int | None] = mapped_column(ForeignKey("wallet_transactions.id"), nullable=True)


class Entitlement(Base):
    __tablename__ = "entitlements"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    feature_key: Mapped[str] = mapped_column(String(100), index=True)  # e.g., "premium_analytics", "export_pdf"
    name: Mapped[str] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)  # "active", "suspended", "revoked", "expired"
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    max_usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class UtilizationRecord(Base):
    __tablename__ = "utilization_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    subscription_id: Mapped[str] = mapped_column(String(128), index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    observation_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    observation_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    purchased_units: Mapped[int] = mapped_column(Integer)
    assigned_units: Mapped[int] = mapped_column(Integer)
    active_units: Mapped[int] = mapped_column(Integer)
    actually_used_units: Mapped[int] = mapped_column(Integer)
    utilization_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PulseRecommendation(Base):
    __tablename__ = "pulse_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    subscription_id: Mapped[str] = mapped_column(String(128), index=True)
    recommendation_type: Mapped[str] = mapped_column(String(40))  # "renew", "downgrade", "upgrade", "right_size", "switch_to_usage"
    reason: Mapped[str] = mapped_column(String(255))
    evidence_summary: Mapped[str] = mapped_column(Text)
    estimated_financial_impact: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(5, 2))  # e.g., 0.95
    suggested_action: Mapped[str] = mapped_column(String(255))
    renewal_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="open", index=True)  # "open", "accepted", "dismissed"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class RevenueHealthScore(Base):
    __tablename__ = "revenue_health_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2))  # 0.00 to 100.00
    risk_category: Mapped[str] = mapped_column(String(30))  # "healthy", "moderate_risk", "high_risk", "critical"
    factors_json: Mapped[str] = mapped_column(Text)  # Factor breakdown and values
    factor_weights_json: Mapped[str] = mapped_column(Text)  # Factor weights
    missing_signals_json: Mapped[str] = mapped_column(Text)  # Missing signals noted explicitly
    retention_guidance: Mapped[str] = mapped_column(Text)
    calculation_version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[str] = mapped_column(String(128), index=True)
    action: Mapped[str] = mapped_column(String(80))
    actor_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    correlation_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    before_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    after_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
