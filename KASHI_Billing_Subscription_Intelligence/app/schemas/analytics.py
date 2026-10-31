from decimal import Decimal
from pydantic import BaseModel


class RevenueMetricsResponse(BaseModel):
    currency: str
    total_invoiced_revenue: Decimal
    total_collected_cash: Decimal
    total_outstanding_revenue: Decimal
    total_refunded_amount: Decimal
    net_collected_revenue: Decimal
    estimated_mrr: Decimal
    estimated_arr: Decimal
    metric_definitions: dict[str, str]


class AgingBucket(BaseModel):
    bucket_name: str  # "Current", "1-30 days", "31-60 days", "61-90 days", "90+ days"
    invoice_count: int
    total_amount: Decimal


class OutstandingMetricsResponse(BaseModel):
    currency: str
    total_outstanding: Decimal
    total_overdue: Decimal
    aging_buckets: list[AgingBucket]
    critical_overdue_invoices_count: int


class CollectionsTrendItem(BaseModel):
    period: str
    amount_collected: Decimal
    transaction_count: int


class CollectionsTrendResponse(BaseModel):
    currency: str
    total_collected: Decimal
    trends: list[CollectionsTrendItem]


class WalletLiabilitiesResponse(BaseModel):
    currency: str
    total_active_wallets: int
    total_wallet_liability_balance: Decimal
    unreconciled_wallets_count: int
    note: str

