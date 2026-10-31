import os
import sys
import sqlite3
from decimal import Decimal
from datetime import datetime, date
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from customers.models import Customer
from products.models import Product, ProductVariant
from plans.models import Plan
from subscriptions.models import Subscription, SubscriptionLine

User = get_user_model()

CONTROL_DB = BASE_DIR.parent / "Brightloop_Subscription_Control_Tower" / "outputs" / "brightloop_300_clients.sqlite3"

def seed():
    print(f"Connecting to source DB: {CONTROL_DB}")
    if not CONTROL_DB.exists():
        print("Source DB not found!")
        return

    conn = sqlite3.connect(CONTROL_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 1. Admin & Staff
    admin_user, _ = User.objects.get_or_create(
        email="admin@brightloop.com",
        defaults={
            "role": User.Role.ADMIN,
            "is_staff": True,
            "is_superuser": True
        }
    )
    admin_user.set_password("AdminPass123!")
    admin_user.save()

    staff_user, _ = User.objects.get_or_create(
        email="staff@brightloop.com",
        defaults={
            "role": User.Role.STAFF,
            "is_staff": True,
            "is_superuser": False
        }
    )
    staff_user.set_password("StaffPass123!")
    staff_user.save()
    print("Admin and Staff users verified/created.")

    # 2. Products
    products_map = {}
    for row in cur.execute("SELECT * FROM products").fetchall():
        p, created = Product.objects.get_or_create(
            name=row["name"],
            defaults={
                "product_type": row["product_type"] or "Subscription Software",
                "sales_price": Decimal(str(row["sales_price"] or 99.0)),
                "cost_price": Decimal(str(row["cost_price"] or 20.0)),
                "description": f"Brightloop {row['name']}"
            }
        )
        products_map[row["id"]] = p
    print(f"Products seeded: {len(products_map)}")

    # 3. Product Variants
    variants_map = {}
    for row in cur.execute("SELECT * FROM product_variants").fetchall():
        parent_p = products_map.get(row["product_id"])
        if parent_p:
            pv, created = ProductVariant.objects.get_or_create(
                product=parent_p,
                variant_name=row["name"],
                defaults={
                    "brand": "Brightloop",
                    "price_adjustment": Decimal(str(row["price_adjustment"] or 0.0))
                }
            )
            variants_map[row["id"]] = pv
    print(f"Product Variants seeded: {len(variants_map)}")

    # 4. Plans
    plans_map = {}
    freq_map = {
        "monthly": Plan.Frequency.MONTHLY,
        "yearly": Plan.Frequency.YEARLY,
        "weekly": Plan.Frequency.WEEKLY,
        "daily": Plan.Frequency.DAILY
    }
    for row in cur.execute("SELECT * FROM plans").fetchall():
        billing_freq = freq_map.get(row["billing_frequency"].lower(), Plan.Frequency.MONTHLY)
        pl, created = Plan.objects.get_or_create(
            name=row["name"],
            defaults={
                "billing_frequency": billing_freq,
                "price": Decimal(str(row["price"] or 100.0)),
                "description": f"{row['name']} plan with {billing_freq} billing"
            }
        )
        plans_map[row["id"]] = pl
    print(f"Plans seeded: {len(plans_map)}")

    # 5. Customers
    cust_map = {}
    for row in cur.execute("SELECT * FROM customers").fetchall():
        email = row["email"].strip().lower()
        u, _ = User.objects.get_or_create(
            email=email,
            defaults={"role": User.Role.CUSTOMER}
        )
        u.set_password("CustomerPass123!")
        u.save()

        c, created = Customer.objects.get_or_create(
            email=email,
            defaults={
                "user": u,
                "contact_person": row["name"],
                "company_name": f"{row['name']} Corp",
                "city": row["country"],
                "state": "Region",
                "assigned_staff": staff_user
            }
        )
        cust_map[row["id"]] = c
    print(f"Customers seeded: {len(cust_map)}")

    # 6. Subscriptions
    subs_count = 0
    status_map = {
        "active": Subscription.Status.ACTIVE,
        "expired": Subscription.Status.CLOSED,
        "cancelled": Subscription.Status.CLOSED,
        "paused": Subscription.Status.PAUSED,
        "draft": Subscription.Status.DRAFT,
        "quotation": Subscription.Status.QUOTATION
    }

    for row in cur.execute("SELECT * FROM subscriptions").fetchall():
        sub_number = row["number"] or f"SUB-{row['id']:05d}"
        customer = cust_map.get(row["customer_id"])
        plan = plans_map.get(row["plan_id"])
        if not customer or not plan:
            continue

        raw_status = (row["status"] or "active").lower()
        sub_status = status_map.get(raw_status, Subscription.Status.ACTIVE)

        start_d = datetime.strptime(row["start_date"], "%Y-%m-%d").date() if row["start_date"] else date(2026, 1, 1)
        end_d = datetime.strptime(row["expiry_date"], "%Y-%m-%d").date() if row["expiry_date"] else date(2026, 12, 31)

        sub, created = Subscription.objects.get_or_create(
            number=sub_number,
            defaults={
                "customer": customer,
                "plan": plan,
                "start_date": start_d,
                "expiry_date": end_d,
                "billing_frequency": plan.billing_frequency,
                "status": sub_status,
                "created_by": staff_user,
                "quantity": 1
            }
        )
        subs_count += 1

    print(f"Subscriptions seeded: {subs_count}")
    conn.close()
    print("Database seeding from Control Tower completed successfully!")

if __name__ == "__main__":
    seed()
