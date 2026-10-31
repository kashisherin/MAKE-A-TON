from datetime import date, timedelta

from .models import *


def build_demo_state() -> TwinState:
    today = date(2026, 10, 31)
    tax = TaxRule(1, "GST 18%", 0.18)
    product = Product(1, "Business Software", "service", 500.0, 120.0, "Brightloop subscription software", [ProductVariant(1, 1, "Odoo Brand", 560.0)])
    plan = Plan(1, "Business Monthly", 500.0, "monthly", 1, today - timedelta(days=365), today + timedelta(days=365), False, True, True, True, 1)
    discount = DiscountRule(1, "Large Team Discount", "percentage", 10.0, min_quantity=10, ends_on=today + timedelta(days=14), product_ids=[1])
    customers = [Customer(1, "Acme Shops", "billing@acme.test"), Customer(2, "Northstar Ltd", "finance@northstar.test"), Customer(3, "Sunrise Cafe", "owner@sunrise.test")]
    users = [User(1, "admin@brightloop.test", Role.ADMIN), User(2, "staff@brightloop.test", Role.STAFF), User(3, customers[0].email, Role.CUSTOMER, 1)]
    line1 = SubscriptionLine(1, 10, 500.0, tax.id)
    line2 = SubscriptionLine(1, 20, 500.0, tax.id, variant_id=1)
    line3 = SubscriptionLine(1, 3, 500.0, tax.id)
    subs = [
        Subscription(1, "SUB-00001", 1, 1, today - timedelta(days=40), None, "net 30", [line1], SubscriptionStatus.ACTIVE, 1, today),
        Subscription(2, "SUB-00002", 2, 1, today - timedelta(days=25), None, "net 30", [line2], SubscriptionStatus.ACTIVE, None, today),
        Subscription(3, "SUB-00003", 3, 1, today - timedelta(days=15), None, "due on receipt", [line3], SubscriptionStatus.ACTIVE, None, today),
    ]
    # Invoices are intentionally seeded to show paid, partial, and overdue states.
    invoices = [
        Invoice(1, "INV-00001", 1, 1, today - timedelta(days=30), today - timedelta(days=1), InvoiceStatus.CONFIRMED, 5000, 500, 810, 5310, 0),
        Invoice(2, "INV-00002", 2, 2, today - timedelta(days=20), today + timedelta(days=10), InvoiceStatus.CONFIRMED, 21200, 0, 3816, 25016, 10000),
        Invoice(3, "INV-00003", 3, 3, today - timedelta(days=5), today + timedelta(days=25), InvoiceStatus.PAID, 1500, 0, 270, 1770, 1770),
    ]
    payments = [Payment(1, 2, "bank_transfer", 10000, today - timedelta(days=3), "Deposit") , Payment(2, 3, "card", 1770, today - timedelta(days=4), "Paid online")]
    quote = QuoteTemplate(1, "Business Starter Quote", 1, [SubscriptionLine(1, 5, 500.0, tax.id)], 30)
    return TwinState(today, users, customers, [product], [plan], [tax], [discount], [quote], subs, invoices, payments)
