from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class WalletCreate(BaseModel):
    customer_id: str = Field(min_length=1)
    organization_id: str | None = None
    currency: str = Field(default="INR", min_length=3, max_length=3)
    spending_limit: Decimal | None = None


class WalletTransactionResponse(BaseModel):
    id: int
    wallet_id: int
    transaction_type: str
    amount: Decimal
    balance_after: Decimal
    currency: str
    reference: str | None
    description: str | None
    idempotency_key: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletResponse(BaseModel):
    id: int
    customer_id: str
    organization_id: str | None
    currency: str
    cached_balance: Decimal
    spending_limit: Decimal | None
    status: str
    expires_at: datetime | None
    created_at: datetime
    recent_transactions: list[WalletTransactionResponse] = []

    model_config = {"from_attributes": True}


class WalletCreditInput(BaseModel):
    amount: Decimal = Field(gt=Decimal("0.00"))
    idempotency_key: str = Field(min_length=1, max_length=200)
    reference: str | None = None
    description: str | None = None


class WalletDebitInput(BaseModel):
    amount: Decimal = Field(gt=Decimal("0.00"))
    idempotency_key: str = Field(min_length=1, max_length=200)
    reference: str | None = None
    description: str | None = None


class WalletReconciliationResponse(BaseModel):
    wallet_id: int
    cached_balance: Decimal
    ledger_sum: Decimal
    is_reconciled: bool
    discrepancy: Decimal
    total_transactions_checked: int

