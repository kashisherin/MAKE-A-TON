from decimal import Decimal
import pytest
from app.models.financial import AuditLog


def test_audit_log_creation(client, db_session):
    # Creating an invoice should write an audit record
    res = client.post(
        "/api/v1/invoices/",
        json={"customer_id": "cust_audit_test", "lines": [{"description": "Audit Test", "quantity": "1", "unit_price": "250.00"}]},
    )
    assert res.status_code == 201

    logs = db_session.query(AuditLog).all()
    assert len(logs) >= 1
    recent = logs[-1]
    assert recent.entity_type == "Invoice"
    assert recent.action == "CREATE"
    assert recent.after_json is not None


def test_financial_analytics(client, db_session):
    # Check revenue metrics endpoint
    rev_res = client.get("/api/v1/analytics/revenue")
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert "total_invoiced_revenue" in rev_data
    assert "total_collected_cash" in rev_data
    assert "estimated_mrr" in rev_data
    assert "metric_definitions" in rev_data

    # Check collections trend
    trend_res = client.get("/api/v1/analytics/collections")
    assert trend_res.status_code == 200

    # Check wallet liabilities
    liab_res = client.get("/api/v1/analytics/wallet-liabilities")
    assert liab_res.status_code == 200
    assert "total_wallet_liability_balance" in liab_res.json()


def test_tenant_data_isolation(client, db_session):
    # Create invoice for org_alpha
    res_alpha = client.post(
        "/api/v1/invoices/",
        headers={"X-Organization-ID": "org_alpha", "X-User-Role": "billing_specialist"},
        json={"customer_id": "cust_alpha", "lines": [{"description": "Alpha Item", "quantity": "1", "unit_price": "500.00"}]},
    )
    inv_alpha_id = res_alpha.json()["id"]

    # Querying from org_beta should NOT return org_alpha's invoice
    res_beta_list = client.get(
        "/api/v1/invoices/",
        headers={"X-Organization-ID": "org_beta", "X-User-Role": "billing_specialist"},
    )
    beta_items = res_beta_list.json()["items"]
    assert not any(item["id"] == inv_alpha_id for item in beta_items)

    # Accessing directly by ID with org_beta headers should return 404
    res_beta_get = client.get(
        f"/api/v1/invoices/{inv_alpha_id}",
        headers={"X-Organization-ID": "org_beta", "X-User-Role": "billing_specialist"},
    )
    assert res_beta_get.status_code == 404


def test_role_based_authorization(client, db_session):
    # Customer role cannot trigger recurring billing run (requires admin)
    res = client.post(
        "/api/v1/billing/run",
        headers={"X-User-Role": "customer"},
        json={"run_type": "manual"},
    )
    assert res.status_code == 403
    assert "Operation requires 'admin' role permission" in res.json()["detail"]

