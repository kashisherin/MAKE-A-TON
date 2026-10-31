from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest
from app.models.financial import Invoice, TaxRule


def test_create_and_finalize_invoice(client, db_session):
    # Setup standard 18% tax rule
    tax_rule = TaxRule(
        organization_id="org_default",
        name="Standard GST",
        code="GST18",
        rate_percent=Decimal("18.0000"),
        jurisdiction_country="IND",
        is_active=True,
    )
    db_session.add(tax_rule)
    db_session.commit()

    # 1. Create draft invoice
    payload = {
        "customer_id": "cust_test_01",
        "currency": "INR",
        "place_of_supply": "KA",
        "lines": [
            {
                "description": "Pro Tier Subscription",
                "quantity": "2.0000",
                "unit_price": "500.00",
                "discount_amount": "100.00",
            }
        ],
    }
    res = client.post("/api/v1/invoices/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "draft"
    assert data["invoice_number"].startswith("INV-")
    # Subtotal = 2 * 500 = 1000
    assert Decimal(str(data["subtotal"])) == Decimal("1000.00")
    # Discount = 100
    assert Decimal(str(data["discount_total"])) == Decimal("100.00")
    # Taxable base = 900. 18% GST of 900 = 162.00
    assert Decimal(str(data["tax_total"])) == Decimal("162.00")
    # Grand Total = 1000 - 100 + 162 = 1062.00
    assert Decimal(str(data["total"])) == Decimal("1062.00")
    assert Decimal(str(data["outstanding_balance"])) == Decimal("1062.00")
    invoice_id = data["id"]

    # 2. Finalize draft invoice
    res_fin = client.post(f"/api/v1/invoices/{invoice_id}/finalize")
    assert res_fin.status_code == 200
    fin_data = res_fin.json()
    assert fin_data["status"] == "issued"
    assert fin_data["finalized_at"] is not None

    # Cannot finalize an already finalized invoice
    res_fin2 = client.post(f"/api/v1/invoices/{invoice_id}/finalize")
    assert res_fin2.status_code == 400


def test_void_invoice_workflow(client, db_session):
    payload = {
        "customer_id": "cust_test_02",
        "currency": "INR",
        "lines": [
            {
                "description": "Basic Access",
                "quantity": "1.0000",
                "unit_price": "200.00",
            }
        ],
    }
    res = client.post("/api/v1/invoices/", json=payload)
    inv_id = res.json()["id"]

    # Void invoice
    res_void = client.post(f"/api/v1/invoices/{inv_id}/void?reason=Customer%20requested%20cancellation")
    assert res_void.status_code == 200
    assert res_void.json()["status"] == "void"


def test_duplicate_subscription_period_prevention(client, db_session):
    start_date = "2026-11-01T00:00:00Z"
    end_date = "2026-11-30T23:59:59Z"
    payload = {
        "customer_id": "cust_acme",
        "subscription_id": "sub_enterprise_999",
        "billing_period_start": start_date,
        "billing_period_end": end_date,
        "lines": [
            {
                "description": "Enterprise Subscription",
                "quantity": "1.0000",
                "unit_price": "5000.00",
            }
        ],
    }
    # First creation should succeed
    res1 = client.post("/api/v1/invoices/", json=payload)
    assert res1.status_code == 201

    # Second creation with identical subscription and billing period MUST be rejected (409 Conflict)
    res2 = client.post("/api/v1/invoices/", json=payload)
    assert res2.status_code == 409
    assert "already exists for subscription" in res2.json()["detail"]


def test_generate_invoice_pdf(client, db_session):
    payload = {
        "customer_id": "cust_pdf_test",
        "currency": "INR",
        "lines": [
            {
                "description": "PDF Test Service",
                "quantity": "1.0000",
                "unit_price": "1500.00",
            }
        ],
    }
    res = client.post("/api/v1/invoices/", json=payload)
    inv_id = res.json()["id"]

    pdf_res = client.get(f"/api/v1/invoices/{inv_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    # PDF files start with %PDF
    assert pdf_res.content.startswith(b"%PDF")

