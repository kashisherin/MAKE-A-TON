from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional


class Role(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CUSTOMER = "customer"


class SubscriptionStatus(str, Enum):
    DRAFT = "draft"
    QUOTATION = "quotation"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    CLOSED = "closed"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PAID = "paid"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"


@dataclass
class User:
    id: int
    email: str
    role: Role
    customer_id: Optional[int] = None


@dataclass
class Customer:
    id: int
    name: str
    email: str
    user_id: Optional[int] = None


@dataclass
class ProductVariant:
    id: int
    product_id: int
    name: str
    price_adjustment: float = 0.0


@dataclass
class Product:
    id: int
    name: str
    product_type: str
    sales_price: float
    cost_price: float
    notes: str = ""
    variants: list[ProductVariant] = field(default_factory=list)


@dataclass
class Plan:
    id: int
    name: str
    price: float
    billing_frequency: str  # daily, weekly, monthly, yearly
    minimum_quantity: int = 1
    available_from: Optional[date] = None
    available_until: Optional[date] = None
    auto_close: bool = False
    allow_early_close: bool = True
    allow_pause: bool = True
    allow_renew: bool = True
    product_id: Optional[int] = None


@dataclass
class TaxRule:
    id: int
    name: str
    rate: float


@dataclass
class DiscountRule:
    id: int
    name: str
    kind: str  # fixed or percentage
    value: float
    min_purchase: float = 0.0
    min_quantity: int = 0
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    usage_limit: Optional[int] = None
    used_count: int = 0
    product_ids: list[int] = field(default_factory=list)
    whole_subscription: bool = False

    def is_eligible(self, on_date: date, subtotal: float, quantity: int, product_id: int) -> bool:
        if self.starts_on and on_date < self.starts_on:
            return False
        if self.ends_on and on_date > self.ends_on:
            return False
        if self.usage_limit is not None and self.used_count >= self.usage_limit:
            return False
        if subtotal < self.min_purchase or quantity < self.min_quantity:
            return False
        if self.product_ids and product_id not in self.product_ids:
            return False
        return self.whole_subscription or bool(self.product_ids)


@dataclass
class SubscriptionLine:
    product_id: int
    quantity: int
    unit_price: float
    tax_rule_id: Optional[int] = None
    variant_id: Optional[int] = None


@dataclass
class QuoteTemplate:
    id: int
    name: str
    plan_id: int
    lines: list[SubscriptionLine]
    valid_for_days: int


@dataclass
class Subscription:
    id: int
    number: str
    customer_id: int
    plan_id: int
    start_date: date
    expiry_date: Optional[date]
    payment_terms: str
    lines: list[SubscriptionLine]
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    discount_rule_id: Optional[int] = None
    next_billing_date: Optional[date] = None
    paused: bool = False


@dataclass
class Invoice:
    id: int
    number: str
    subscription_id: int
    customer_id: int
    issued_on: date
    due_on: date
    status: InvoiceStatus
    subtotal: float
    discount: float
    tax: float
    total: float
    paid_amount: float = 0.0

    @property
    def balance_due(self) -> float:
        return round(max(self.total - self.paid_amount, 0.0), 2)

    @property
    def payment_status(self) -> PaymentStatus:
        if self.status == InvoiceStatus.CANCELLED:
            return PaymentStatus.UNPAID
        if self.balance_due <= 0:
            return PaymentStatus.PAID
        if self.paid_amount > 0:
            return PaymentStatus.PARTIAL
        return PaymentStatus.OVERDUE


@dataclass
class Payment:
    id: int
    invoice_id: int
    method: str
    amount: float
    paid_on: date
    note: str = ""


@dataclass
class TwinState:
    as_of: date
    users: list[User] = field(default_factory=list)
    customers: list[Customer] = field(default_factory=list)
    products: list[Product] = field(default_factory=list)
    plans: list[Plan] = field(default_factory=list)
    taxes: list[TaxRule] = field(default_factory=list)
    discounts: list[DiscountRule] = field(default_factory=list)
    quote_templates: list[QuoteTemplate] = field(default_factory=list)
    subscriptions: list[Subscription] = field(default_factory=list)
    invoices: list[Invoice] = field(default_factory=list)
    payments: list[Payment] = field(default_factory=list)
