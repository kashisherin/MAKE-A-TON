from __future__ import annotations

import csv
import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "outputs"
OUT.mkdir(exist_ok=True)
DB_PATH = OUT / "brightloop_300_clients.sqlite3"
CSV_PATH = OUT / "brightloop_300_clients.csv"

random.seed(20261031)
TODAY = date(2026, 10, 31)


def iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


def create_schema(conn: sqlite3.Connection):
    conn.executescript("""
    PRAGMA foreign_keys = ON;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS subscription_lines;
    DROP TABLE IF EXISTS subscriptions;
    DROP TABLE IF EXISTS quotation_lines;
    DROP TABLE IF EXISTS quotations;
    DROP TABLE IF EXISTS discount_rules;
    DROP TABLE IF EXISTS tax_rules;
    DROP TABLE IF EXISTS plans;
    DROP TABLE IF EXISTS product_variants;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS customers;

    CREATE TABLE customers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        company_size TEXT NOT NULL,
        industry TEXT NOT NULL,
        country TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK(role IN ('admin','staff','customer')),
        customer_id INTEGER REFERENCES customers(id)
    );

    CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        product_type TEXT NOT NULL,
        sales_price REAL NOT NULL,
        cost_price REAL NOT NULL,
        notes TEXT
    );

    CREATE TABLE product_variants (
        id INTEGER PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        name TEXT NOT NULL,
        price_adjustment REAL NOT NULL
    );

    CREATE TABLE plans (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        billing_frequency TEXT NOT NULL,
        minimum_quantity INTEGER NOT NULL,
        available_from TEXT,
        available_until TEXT,
        auto_close INTEGER NOT NULL,
        allow_early_close INTEGER NOT NULL,
        allow_pause INTEGER NOT NULL,
        allow_renew INTEGER NOT NULL,
        product_id INTEGER REFERENCES products(id)
    );

    CREATE TABLE tax_rules (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        rate REAL NOT NULL
    );

    CREATE TABLE discount_rules (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('fixed','percentage')),
        value REAL NOT NULL,
        min_purchase REAL NOT NULL,
        min_quantity INTEGER NOT NULL,
        starts_on TEXT,
        ends_on TEXT,
        usage_limit INTEGER,
        used_count INTEGER NOT NULL,
        whole_subscription INTEGER NOT NULL
    );

    CREATE TABLE quotations (
        id INTEGER PRIMARY KEY,
        quote_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        plan_id INTEGER NOT NULL REFERENCES plans(id),
        status TEXT NOT NULL,
        quoted_on TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        payment_terms TEXT NOT NULL
    );

    CREATE TABLE quotation_lines (
        id INTEGER PRIMARY KEY,
        quotation_id INTEGER NOT NULL REFERENCES quotations(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        tax_rule_id INTEGER REFERENCES tax_rules(id)
    );

    CREATE TABLE subscriptions (
        id INTEGER PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        plan_id INTEGER NOT NULL REFERENCES plans(id),
        status TEXT NOT NULL,
        start_date TEXT NOT NULL,
        expiry_date TEXT,
        payment_terms TEXT NOT NULL,
        discount_rule_id INTEGER REFERENCES discount_rules(id),
        next_billing_date TEXT,
        paused INTEGER NOT NULL
    );

    CREATE TABLE subscription_lines (
        id INTEGER PRIMARY KEY,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        tax_rule_id INTEGER REFERENCES tax_rules(id)
    );

    CREATE TABLE invoices (
        id INTEGER PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        issued_on TEXT NOT NULL,
        due_on TEXT NOT NULL,
        status TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL,
        tax REAL NOT NULL,
        total REAL NOT NULL,
        paid_amount REAL NOT NULL
    );

    CREATE TABLE payments (
        id INTEGER PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id),
        method TEXT NOT NULL,
        amount REAL NOT NULL,
        paid_on TEXT NOT NULL,
        note TEXT
    );

    CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
    CREATE INDEX idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX idx_invoices_due ON invoices(due_on);
    CREATE INDEX idx_payments_invoice ON payments(invoice_id);
    """)


def build_database():
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    create_schema(conn)

    industries = ["Retail", "Healthcare", "Education", "Logistics", "Hospitality", "Professional Services", "Manufacturing", "Technology"]
    countries = ["India", "Singapore", "United Kingdom", "United States", "Australia"]
    sizes = ["small", "medium", "large"]
    first_names = ["Aarav", "Ananya", "Riya", "Kabir", "Meera", "Arjun", "Ishaan", "Nisha", "Vikram", "Sara", "Dev", "Maya"]
    last_names = ["Sharma", "Patel", "Kapoor", "Mehta", "Rao", "Iyer", "Gupta", "Singh", "Nair", "Thomas", "Das", "Bose"]

    customers = []
    for i in range(1, 301):
        name = f"{random.choice(first_names)} {random.choice(last_names)} & Co."
        customers.append((i, name, f"client{i:03d}@brightloop-demo.test", random.choice(sizes), random.choice(industries), random.choice(countries), iso(TODAY - timedelta(days=random.randint(30, 800)))))
    conn.executemany("INSERT INTO customers VALUES (?,?,?,?,?,?,?)", customers)

    users = [(1, "admin@brightloop-demo.test", "admin", None), (2, "staff@brightloop-demo.test", "staff", None)]
    users += [(i + 3, c[2], "customer", c[0]) for i, c in enumerate(customers)]
    conn.executemany("INSERT INTO users VALUES (?,?,?,?)", users)

    products = [
        (1, "Brightloop Core", "service", 499.0, 110.0, "Core subscription management workspace"),
        (2, "Brightloop Analytics", "service", 799.0, 180.0, "Advanced finance and reporting module"),
        (3, "Brightloop Support", "service", 299.0, 75.0, "Priority support add-on"),
    ]
    conn.executemany("INSERT INTO products VALUES (?,?,?,?,?,?)", products)
    variants = [(1, 1, "Standard", 0.0), (2, 1, "Odoo Brand", 560.0), (3, 2, "Enterprise", 950.0)]
    conn.executemany("INSERT INTO product_variants VALUES (?,?,?,?)", variants)

    plans = [
        (1, "Core Monthly", 499.0, "monthly", 1, iso(TODAY - timedelta(days=365)), iso(TODAY + timedelta(days=365)), 0, 1, 1, 1, 1),
        (2, "Core Yearly", 4990.0, "yearly", 1, iso(TODAY - timedelta(days=365)), iso(TODAY + timedelta(days=365)), 0, 1, 1, 1, 1),
        (3, "Analytics Monthly", 799.0, "monthly", 1, iso(TODAY - timedelta(days=365)), iso(TODAY + timedelta(days=365)), 0, 1, 1, 1, 2),
        (4, "Support Weekly", 299.0, "weekly", 1, iso(TODAY - timedelta(days=365)), iso(TODAY + timedelta(days=365)), 0, 1, 0, 0, 3),
    ]
    conn.executemany("INSERT INTO plans VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", plans)
    conn.executemany("INSERT INTO tax_rules VALUES (?,?,?)", [(1, "GST 18%", 0.18), (2, "Zero Tax", 0.0)])

    discounts = [
        (1, "Team 10%", "percentage", 10.0, 0.0, 10, iso(TODAY - timedelta(days=60)), iso(TODAY + timedelta(days=30)), 100, 0, 1),
        (2, "Starter 250", "fixed", 250.0, 1000.0, 1, iso(TODAY - timedelta(days=90)), iso(TODAY + timedelta(days=90)), 150, 0, 1),
        (3, "Expired Launch", "percentage", 15.0, 0.0, 1, iso(TODAY - timedelta(days=180)), iso(TODAY - timedelta(days=10)), 50, 50, 1),
    ]
    conn.executemany("INSERT INTO discount_rules VALUES (?,?,?,?,?,?,?,?,?,?,?)", discounts)

    quotation_rows, quotation_lines = [], []
    sub_rows, sub_lines = [], []
    invoice_rows, payment_rows = [], []
    quote_id = sub_id = line_id = invoice_id = payment_id = 1
    statuses = ["draft", "quotation", "confirmed", "active", "closed"]
    for customer_id in range(1, 301):
        plan_id = random.choices([1, 2, 3, 4], weights=[55, 15, 20, 10])[0]
        plan = next(p for p in plans if p[0] == plan_id)
        product_id = plan[11]
        quantity = random.randint(1, 30 if customer_id % 7 == 0 else 10)
        start = TODAY - timedelta(days=random.randint(10, 500))
        status = random.choices(statuses, weights=[3, 5, 7, 80, 5])[0]
        discount_id = 1 if quantity >= 10 and customer_id % 4 == 0 else (2 if customer_id % 17 == 0 else None)
        next_bill = TODAY + timedelta(days=random.randint(0, 30)) if status == "active" else None
        sub_rows.append((sub_id, f"SUB-{sub_id:05d}", customer_id, plan_id, status, iso(start), None, random.choice(["net 15", "net 30", "due on receipt"]), discount_id, iso(next_bill), 0))
        variant_id = 2 if product_id == 1 and customer_id % 11 == 0 else None
        line_price = float(plan[2])
        sub_lines.append((line_id, sub_id, product_id, variant_id, quantity, line_price, 1))
        line_id += 1

        quote_date = start - timedelta(days=random.randint(1, 30))
        quotation_rows.append((quote_id, f"QUO-{quote_id:05d}", customer_id, plan_id, "confirmed" if status in ["confirmed", "active", "closed"] else "draft", iso(quote_date), iso(quote_date + timedelta(days=30)), "net 30"))
        quotation_lines.append((quote_id, quote_id, product_id, quantity, line_price, 1))
        quote_id += 1

        if status in ["active", "closed", "confirmed"]:
            base = line_price * quantity
            discount = base * 0.10 if discount_id == 1 else (250.0 if discount_id == 2 and base >= 1000 else 0.0)
            tax = (base - min(discount, base)) * 0.18
            total = round(base - min(discount, base) + tax, 2)
            issued = TODAY - timedelta(days=random.randint(0, 60))
            due = issued + timedelta(days=random.choice([15, 30]))
            is_overdue = due < TODAY and customer_id % 9 == 0
            paid = 0.0 if is_overdue else (total if customer_id % 5 else round(total * 0.5, 2))
            inv_status = "paid" if paid >= total else "confirmed"
            invoice_rows.append((invoice_id, f"INV-{invoice_id:05d}", sub_id, customer_id, iso(issued), iso(due), inv_status, round(base, 2), round(min(discount, base), 2), round(tax, 2), total, paid))
            if paid > 0:
                payment_rows.append((payment_id, invoice_id, random.choice(["card", "bank_transfer", "cash"]), paid, iso(issued + timedelta(days=random.randint(0, 10))), "Synthetic demo payment"))
                payment_id += 1
            invoice_id += 1
        sub_id += 1

    conn.executemany("INSERT INTO quotations VALUES (?,?,?,?,?,?,?,?)", quotation_rows)
    conn.executemany("INSERT INTO quotation_lines VALUES (?,?,?,?,?,?)", quotation_lines)
    conn.executemany("INSERT INTO subscriptions VALUES (?,?,?,?,?,?,?,?,?,?,?)", sub_rows)
    conn.executemany("INSERT INTO subscription_lines VALUES (?,?,?,?,?,?,?)", sub_lines)
    conn.executemany("INSERT INTO invoices VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", invoice_rows)
    conn.executemany("INSERT INTO payments VALUES (?,?,?,?,?,?)", payment_rows)
    conn.commit()

    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["customer_id", "name", "email", "company_size", "industry", "country", "created_at"])
        writer.writerows(customers)

    summary = {table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in ["customers", "users", "products", "product_variants", "plans", "tax_rules", "discount_rules", "quotations", "quotation_lines", "subscriptions", "subscription_lines", "invoices", "payments"]}
    conn.close()
    print(f"Created {DB_PATH}")
    print(f"Created {CSV_PATH}")
    for key, value in summary.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    build_database()
