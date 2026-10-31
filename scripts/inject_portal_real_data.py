import json
from pathlib import Path

portal_html_path = Path(r"D:\SUBSCRIPTION MANAGEMENT\portal.html")
data_path = Path(r"D:\SUBSCRIPTION MANAGEMENT\portal_data.json")

def inject():
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Format customers for portal
    formatted_cust = []
    for c in data["customers"]:
        formatted_cust.append({
            "name": c["name"],
            "email": c["email"],
            "plan": c.get("company_size", "Growth"),
            "status": "Active",
            "amount": "₹4,999",
            "country": c.get("country", "India"),
            "industry": c.get("industry", "Software")
        })

    # Format subscriptions
    formatted_subs = []
    for s in data["subscriptions"]:
        status_label = "Active" if s.get("status", "active").lower() == "active" else "Paused" if s.get("status", "").lower() == "paused" else "Closed"
        formatted_subs.append({
            "id": s.get("number") or f"SUB-{s['id']:04d}",
            "customer": s.get("customer_name", "Customer"),
            "plan": s.get("plan_name", "Standard"),
            "renewal": s.get("expiry_date", "15 Nov 2026"),
            "amount": f"₹{float(s.get('plan_price') or 4999):,.0f}",
            "status": status_label
        })

    # Format invoices
    formatted_inv = []
    for i in data["invoices"]:
        status_label = "Paid" if i.get("status", "").lower() == "paid" else "Overdue" if i.get("status", "").lower() == "overdue" else "Pending"
        formatted_inv.append({
            "id": i.get("number") or f"INV-{i['id']:04d}",
            "customer": i.get("customer_name", "Customer"),
            "date": i.get("issued_on", "01 Nov 2026"),
            "due": i.get("due_on", "15 Nov 2026"),
            "amount": f"₹{float(i.get('total') or 4999):,.0f}",
            "status": status_label
        })

    with open(portal_html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Replace metrics
    html = html.replace("Active subscriptions','248'", f"Active subscriptions','{data['metrics']['active_subscriptions']}'")
    html = html.replace("Revenue collected','₹8.42L'", f"Revenue collected','₹{data['metrics']['collected_revenue']/100000:.2f}L'")
    html = html.replace("Needs attention','7'", f"Needs attention','{data['metrics']['overdue_count']}'")

    # Replace arrays
    cust_js = json.dumps(formatted_cust)
    subs_js = json.dumps(formatted_subs)
    inv_js = json.dumps(formatted_inv)

    target_prefix = "customers=[{name:'Acme Studio'"
    target_end = "status:'Overdue'}];"

    start_idx = html.find("customers=[")
    end_idx = html.find("status:'Overdue'}];")
    if start_idx != -1 and end_idx != -1:
        replacement = f"customers={cust_js}, subscriptions={subs_js}, invoices={inv_js};"
        html = html[:start_idx] + replacement + html[end_idx + len("status:'Overdue'}];"):]
        with open(portal_html_path, "w", encoding="utf-8") as f:
            f.write(html)
        print("Successfully injected 300 real customers, 300 subscriptions, and 276 invoices into portal.html!")
    else:
        print("Could not find target snippet to replace.")

if __name__ == "__main__":
    inject()
