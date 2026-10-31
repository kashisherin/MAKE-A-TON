import sqlite3
import json
from pathlib import Path

db_path = Path(r"D:\SUBSCRIPTION MANAGEMENT\Brightloop_Subscription_Control_Tower\outputs\brightloop_300_clients.sqlite3")

def export():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    customers = [dict(r) for r in cur.execute("SELECT * FROM customers ORDER BY id ASC").fetchall()]
    products = [dict(r) for r in cur.execute("SELECT * FROM products ORDER BY id ASC").fetchall()]
    variants = [dict(r) for r in cur.execute("SELECT * FROM product_variants ORDER BY id ASC").fetchall()]
    plans = [dict(r) for r in cur.execute("SELECT * FROM plans ORDER BY id ASC").fetchall()]
    subs = [dict(r) for r in cur.execute("""
        SELECT s.*, c.name as customer_name, c.email as customer_email, p.name as plan_name, p.price as plan_price, p.billing_frequency
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        JOIN plans p ON s.plan_id = p.id
        ORDER BY s.id ASC
    """).fetchall()]
    invoices = [dict(r) for r in cur.execute("""
        SELECT i.*, c.name as customer_name, c.email as customer_email, s.number as subscription_number
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        LEFT JOIN subscriptions s ON i.subscription_id = s.id
        ORDER BY i.id DESC
    """).fetchall()]
    payments = [dict(r) for r in cur.execute("SELECT * FROM payments ORDER BY id DESC").fetchall()]

    # Summary metrics
    total_invoiced = sum(float(i["total"] or 0) for i in invoices)
    collected = sum(float(p["amount"] or 0) for p in payments)
    overdue_invoices = [i for i in invoices if (i["status"] or "").lower() == "overdue"]
    overdue_amount = sum(float(i["total"] or 0) - float(i["paid_amount"] or 0) for i in overdue_invoices)
    active_subs = [s for s in subs if (s["status"] or "").lower() == "active"]

    data = {
        "metrics": {
            "total_invoiced": round(total_invoiced, 2),
            "collected_revenue": round(collected, 2),
            "outstanding_revenue": round(total_invoiced - collected, 2),
            "overdue_amount": round(overdue_amount, 2),
            "overdue_count": len(overdue_invoices),
            "total_customers": len(customers),
            "total_subscriptions": len(subs),
            "active_subscriptions": len(active_subs),
            "plans_count": len(plans),
            "invoices_count": len(invoices),
            "payments_count": len(payments)
        },
        "customers": customers,
        "products": products,
        "variants": variants,
        "plans": plans,
        "subscriptions": subs,
        "invoices": invoices,
        "payments": payments
    }

    out_file = Path(r"D:\SUBSCRIPTION MANAGEMENT\portal_data.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Exported portal data successfully! Customers: {len(customers)}, Subscriptions: {len(subs)}, Invoices: {len(invoices)}")
    conn.close()

if __name__ == "__main__":
    export()
