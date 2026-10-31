from decimal import Decimal
import pytest


def test_recurring_billing_run_and_idempotency(client, db_session):
    # 1. Trigger billing run
    run_payload = {
        "as_of_date": "2026-11-01T00:00:00Z",
        "run_type": "scheduled",
    }
    res1 = client.post("/api/v1/billing/run", json=run_payload)
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["status"] == "completed"
    assert data1["invoices_generated"] == 2
    assert data1["total_subscriptions_evaluated"] == 2
    assert Decimal(str(data1["total_billed_amount"])) > Decimal("0.00")

    # 2. Trigger again for same date -> should skip and generate 0 new invoices
    res2 = client.post("/api/v1/billing/run", json=run_payload)
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["invoices_generated"] == 0
    assert any(ev["status"] == "skipped" for ev in data2["events"])


def test_overdue_aging_analysis(client, db_session):
    # Create an invoice due in the past
    inv_res = client.post(
        "/api/v1/invoices/",
        json={
            "customer_id": "cust_overdue_01",
            "due_at": "2026-09-01T00:00:00Z",
            "lines": [{"description": "Old Invoiced Service", "quantity": "1", "unit_price": "800.00"}],
        },
    )
    inv_id = inv_res.json()["id"]
    client.post(f"/api/v1/invoices/{inv_id}/finalize")

    aging_res = client.get("/api/v1/analytics/outstanding")
    assert aging_res.status_code == 200
    aging_data = aging_res.json()
    assert Decimal(str(aging_data["total_outstanding"])) >= Decimal("800.00")
    assert len(aging_data["aging_buckets"]) == 5


def test_customer_reliability_score(client, db_session):
    # Create invoice for customer
    inv_res = client.post(
        "/api/v1/invoices/",
        json={
            "customer_id": "cust_reliable_01",
            "lines": [{"description": "Monthly Service", "quantity": "1", "unit_price": "400.00"}],
        },
    )
    inv_data = inv_res.json()
    client.post(f"/api/v1/invoices/{inv_data['id']}/finalize")

    # Pay on time
    client.post(
        "/api/v1/payments/",
        json={
            "customer_id": "cust_reliable_01",
            "invoice_id": inv_data["id"],
            "amount": inv_data["total"],
            "method": "upi",
            "idempotency_key": "idemp_rel_pay_1",
        },
    )

    score_res = client.get("/api/v1/analytics/reliability/cust_reliable_01")
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert score_data["rating"] == "A"
    assert Decimal(str(score_data["reliability_score"])) == Decimal("100.00")
