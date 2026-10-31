from decimal import Decimal
import pytest


def test_full_payment_lifecycle(client, db_session):
    # 1. Create invoice
    inv_res = client.post(
        "/api/v1/invoices/",
        json={
            "customer_id": "cust_pay_01",
            "lines": [{"description": "Monthly Plan", "quantity": "1", "unit_price": "1000.00"}],
        },
    )
    inv_data = inv_res.json()
    inv_id = inv_data["id"]
    client.post(f"/api/v1/invoices/{inv_id}/finalize")

    # 2. Record full payment
    total_amount = inv_data["total"]
    pmt_payload = {
        "customer_id": "cust_pay_01",
        "invoice_id": inv_id,
        "amount": total_amount,
        "method": "card",
        "idempotency_key": "idemp_pay_001",
    }
    pmt_res = client.post("/api/v1/payments/", json=pmt_payload)
    assert pmt_res.status_code == 201
    pmt_data = pmt_res.json()
    assert pmt_data["status"] == "cleared"

    # Verify invoice status is now 'paid' and outstanding balance is 0
    updated_inv = client.get(f"/api/v1/invoices/{inv_id}").json()
    assert updated_inv["status"] == "paid"
    assert Decimal(str(updated_inv["outstanding_balance"])) == Decimal("0.00")
    assert Decimal(str(updated_inv["amount_paid"])) == Decimal(str(total_amount))


def test_partial_payment_and_refund(client, db_session):
    inv_res = client.post(
        "/api/v1/invoices/",
        json={
            "customer_id": "cust_pay_02",
            "lines": [{"description": "Service Fee", "quantity": "1", "unit_price": "2000.00"}],
        },
    )
    inv_data = inv_res.json()
    inv_id = inv_data["id"]
    client.post(f"/api/v1/invoices/{inv_id}/finalize")

    # Partial payment of 800
    pmt_res = client.post(
        "/api/v1/payments/",
        json={
            "customer_id": "cust_pay_02",
            "invoice_id": inv_id,
            "amount": "800.00",
            "method": "upi",
            "idempotency_key": "idemp_pay_part_002",
        },
    )
    assert pmt_res.status_code == 201
    pmt_id = pmt_res.json()["id"]

    # Verify partially_paid
    inv_after_part = client.get(f"/api/v1/invoices/{inv_id}").json()
    assert inv_after_part["status"] == "partially_paid"
    assert Decimal(str(inv_after_part["amount_paid"])) == Decimal("800.00")

    # Record partial refund of 300
    ref_res = client.post(
        f"/api/v1/payments/{pmt_id}/refund",
        json={
            "amount": "300.00",
            "reason": "Billing adjustment",
            "idempotency_key": "idemp_ref_001",
        },
    )
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    assert ref_data["status"] == "completed"
    assert Decimal(str(ref_data["amount"])) == Decimal("300.00")

    # Invoice amount_paid should now be 500
    inv_after_ref = client.get(f"/api/v1/invoices/{inv_id}").json()
    assert Decimal(str(inv_after_ref["amount_paid"])) == Decimal("500.00")


def test_multi_invoice_payment_allocation(client, db_session):
    # Create two invoices for customer
    inv1 = client.post(
        "/api/v1/invoices/",
        json={"customer_id": "cust_multi", "lines": [{"description": "Item 1", "quantity": "1", "unit_price": "500.00"}]},
    ).json()
    inv2 = client.post(
        "/api/v1/invoices/",
        json={"customer_id": "cust_multi", "lines": [{"description": "Item 2", "quantity": "1", "unit_price": "700.00"}]},
    ).json()
    client.post(f"/api/v1/invoices/{inv1['id']}/finalize")
    client.post(f"/api/v1/invoices/{inv2['id']}/finalize")

    # Single payment of 1000 allocated across both: 500 to inv1, 500 to inv2
    pmt_res = client.post(
        "/api/v1/payments/",
        json={
            "customer_id": "cust_multi",
            "amount": "1000.00",
            "method": "bank_transfer",
            "idempotency_key": "idemp_multi_alloc_01",
            "allocations": [
                {"invoice_id": inv1["id"], "amount": "500.00"},
                {"invoice_id": inv2["id"], "amount": "500.00"},
            ],
        },
    )
    assert pmt_res.status_code == 201

    inv1_updated = client.get(f"/api/v1/invoices/{inv1['id']}").json()
    inv2_updated = client.get(f"/api/v1/invoices/{inv2['id']}").json()
    assert Decimal(str(inv1_updated["amount_paid"])) == Decimal("500.00")
    assert Decimal(str(inv2_updated["amount_paid"])) == Decimal("500.00")


def test_payment_idempotency(client, db_session):
    inv = client.post(
        "/api/v1/invoices/",
        json={"customer_id": "cust_idemp", "lines": [{"description": "Service", "quantity": "1", "unit_price": "300.00"}]},
    ).json()
    client.post(f"/api/v1/invoices/{inv['id']}/finalize")

    payload = {
        "customer_id": "cust_idemp",
        "invoice_id": inv["id"],
        "amount": "300.00",
        "method": "card",
        "idempotency_key": "unique_idemp_key_123",
    }
    res1 = client.post("/api/v1/payments/", json=payload)
    assert res1.status_code == 201
    pmt_id_1 = res1.json()["id"]

    # Repeated request with same idempotency key returns the same payment record without double-charging
    res2 = client.post("/api/v1/payments/", json=payload)
    assert res2.status_code == 201
    pmt_id_2 = res2.json()["id"]
    assert pmt_id_1 == pmt_id_2

