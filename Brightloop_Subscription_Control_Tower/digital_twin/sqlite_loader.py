from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path

from .models import (
    Customer, DiscountRule, Invoice, InvoiceStatus, Payment, Plan, Product,
    ProductVariant, QuoteTemplate, Role, Subscription, SubscriptionLine,
    SubscriptionStatus, TaxRule, TwinState, User
)


def _date(value):
    return date.fromisoformat(value) if value else None


def load_twin_from_sqlite(db_path: str | Path, as_of: date | None = None) -> TwinState:
    """Load the complete SQLite dataset into the Digital Twin model."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        customers = [Customer(r["id"], r["name"], r["email"], None) for r in conn.execute("SELECT * FROM customers ORDER BY id")]
        users = [User(r["id"], r["email"], Role(r["role"]), r["customer_id"]) for r in conn.execute("SELECT * FROM users ORDER BY id")]

        variants_by_product = {}
        for r in conn.execute("SELECT * FROM product_variants ORDER BY id"):
            variants_by_product.setdefault(r["product_id"], []).append(ProductVariant(r["id"], r["product_id"], r["name"], r["price_adjustment"]))
        products = [Product(r["id"], r["name"], r["product_type"], r["sales_price"], r["cost_price"], r["notes"] or "", variants_by_product.get(r["id"], [])) for r in conn.execute("SELECT * FROM products ORDER BY id")]
        plans = [Plan(r["id"], r["name"], r["price"], r["billing_frequency"], r["minimum_quantity"], _date(r["available_from"]), _date(r["available_until"]), bool(r["auto_close"]), bool(r["allow_early_close"]), bool(r["allow_pause"]), bool(r["allow_renew"]), r["product_id"]) for r in conn.execute("SELECT * FROM plans ORDER BY id")]
        taxes = [TaxRule(r["id"], r["name"], r["rate"]) for r in conn.execute("SELECT * FROM tax_rules ORDER BY id")]
        discounts = [DiscountRule(r["id"], r["name"], r["kind"], r["value"], r["min_purchase"], r["min_quantity"], _date(r["starts_on"]), _date(r["ends_on"]), r["usage_limit"], r["used_count"], [], bool(r["whole_subscription"])) for r in conn.execute("SELECT * FROM discount_rules ORDER BY id")]

        quote_lines = {}
        for r in conn.execute("SELECT * FROM quotation_lines ORDER BY id"):
            quote_lines.setdefault(r["quotation_id"], []).append(SubscriptionLine(r["product_id"], r["quantity"], r["unit_price"], r["tax_rule_id"]))
        quotes = [QuoteTemplate(r["id"], r["quote_number"], r["plan_id"], quote_lines.get(r["id"], []), max((_date(r["valid_until"]) - _date(r["quoted_on"])).days, 0)) for r in conn.execute("SELECT * FROM quotations ORDER BY id")]

        sub_lines = {}
        for r in conn.execute("SELECT * FROM subscription_lines ORDER BY id"):
            sub_lines.setdefault(r["subscription_id"], []).append(SubscriptionLine(r["product_id"], r["quantity"], r["unit_price"], r["tax_rule_id"], r["variant_id"]))
        subscriptions = [Subscription(r["id"], r["number"], r["customer_id"], r["plan_id"], _date(r["start_date"]), _date(r["expiry_date"]), r["payment_terms"], sub_lines.get(r["id"], []), SubscriptionStatus(r["status"]), r["discount_rule_id"], _date(r["next_billing_date"]), bool(r["paused"])) for r in conn.execute("SELECT * FROM subscriptions ORDER BY id")]
        invoices = [Invoice(r["id"], r["number"], r["subscription_id"], r["customer_id"], _date(r["issued_on"]), _date(r["due_on"]), InvoiceStatus(r["status"]), r["subtotal"], r["discount"], r["tax"], r["total"], r["paid_amount"]) for r in conn.execute("SELECT * FROM invoices ORDER BY id")]
        payments = [Payment(r["id"], r["invoice_id"], r["method"], r["amount"], _date(r["paid_on"]), r["note"] or "") for r in conn.execute("SELECT * FROM payments ORDER BY id")]
        return TwinState(as_of or date.today(), users, customers, products, plans, taxes, discounts, quotes, subscriptions, invoices, payments)
    finally:
        conn.close()


def validate_twin(state: TwinState) -> dict[str, int]:
    """Return basic referential-integrity counts for a loaded twin."""
    customer_ids = {x.id for x in state.customers}
    plan_ids = {x.id for x in state.plans}
    subscription_ids = {x.id for x in state.subscriptions}
    invoice_ids = {x.id for x in state.invoices}
    return {
        "customers": len(state.customers),
        "subscriptions": len(state.subscriptions),
        "invoices": len(state.invoices),
        "payments": len(state.payments),
        "orphan_subscriptions": sum(x.customer_id not in customer_ids or x.plan_id not in plan_ids for x in state.subscriptions),
        "orphan_invoices": sum(x.subscription_id not in subscription_ids or x.customer_id not in customer_ids for x in state.invoices),
        "orphan_payments": sum(x.invoice_id not in invoice_ids for x in state.payments),
    }
