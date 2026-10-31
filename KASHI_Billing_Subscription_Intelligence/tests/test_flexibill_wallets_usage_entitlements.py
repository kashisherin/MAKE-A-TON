from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest
from app.workers.expiry_worker import run_entitlement_expiry_sweep


def test_wallet_ledger_and_overdraft_prevention(client, db_session):
    # 1. Create wallet
    w_res = client.post("/api/v1/flexi-bill/wallets", json={"customer_id": "cust_wallet_01", "currency": "INR"})
    assert w_res.status_code == 201
    wallet_id = w_res.json()["id"]

    # 2. Credit wallet with 500
    credit_res = client.post(
        f"/api/v1/flexi-bill/wallets/{wallet_id}/credit",
        json={"amount": "500.00", "idempotency_key": "idemp_credit_01", "description": "Top-up"},
    )
    assert credit_res.status_code == 200
    assert Decimal(str(credit_res.json()["balance_after"])) == Decimal("500.00")

    # 3. Debit wallet with 200
    debit_res = client.post(
        f"/api/v1/flexi-bill/wallets/{wallet_id}/debit",
        json={"amount": "200.00", "idempotency_key": "idemp_debit_01", "description": "API calls"},
    )
    assert debit_res.status_code == 200
    assert Decimal(str(debit_res.json()["balance_after"])) == Decimal("300.00")

    # 4. Attempt overdraft (debit 400 when balance is 300) -> MUST FAIL (402)
    overdraft_res = client.post(
        f"/api/v1/flexi-bill/wallets/{wallet_id}/debit",
        json={"amount": "400.00", "idempotency_key": "idemp_debit_02", "description": "Overdraft attempt"},
    )
    assert overdraft_res.status_code == 402
    assert "Insufficient wallet funds" in overdraft_res.json()["detail"]

    # 5. Ledger reconciliation
    rec_res = client.get(f"/api/v1/flexi-bill/wallets/{wallet_id}/reconcile")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["is_reconciled"] is True
    assert Decimal(str(rec_data["cached_balance"])) == Decimal("300.00")
    assert Decimal(str(rec_data["ledger_sum"])) == Decimal("300.00")
    assert Decimal(str(rec_data["discrepancy"])) == Decimal("0.00")


def test_usage_ingestion_and_auto_debit(client, db_session):
    # Setup pricing rule
    rule_res = client.post(
        "/api/v1/flexi-bill/usage/rules",
        json={
            "product_id": "prod_ai_models",
            "metric_name": "ai_tokens",
            "model_type": "flat",
            "unit_price": "0.010000",
        },
    )
    assert rule_res.status_code == 201

    # Fund wallet
    w_res = client.post("/api/v1/flexi-bill/wallets", json={"customer_id": "cust_usage_user"})
    wallet_id = w_res.json()["id"]
    client.post(
        f"/api/v1/flexi-bill/wallets/{wallet_id}/credit",
        json={"amount": "100.00", "idempotency_key": "idemp_fund_usage"},
    )

    # Ingest usage event with auto_debit_wallet = True
    # 5000 tokens @ 0.01 = 50.00 debit
    event_payload = {
        "customer_id": "cust_usage_user",
        "metric_name": "ai_tokens",
        "quantity": "5000.0000",
        "idempotency_key": "idemp_usage_ev_101",
        "auto_debit_wallet": True,
    }
    ev_res = client.post("/api/v1/flexi-bill/usage/events", json=event_payload)
    assert ev_res.status_code == 201
    ev_data = ev_res.json()
    assert ev_data["billed_status"] == "billed"
    assert ev_data["wallet_transaction_id"] is not None

    # Wallet balance should now be 50.00
    wallet_check = client.get(f"/api/v1/flexi-bill/wallets/{wallet_id}").json()
    assert Decimal(str(wallet_check["cached_balance"])) == Decimal("50.00")


def test_digital_entitlements_and_micro_subscriptions(client, db_session):
    # Grant temporary micro-subscription: 24 hour access
    grant_payload = {
        "customer_id": "cust_micro_01",
        "feature_key": "premium_reports",
        "name": "24-Hour Premium Analytics Access",
        "duration_hours": 24,
    }
    grant_res = client.post("/api/v1/flexi-bill/entitlements", json=grant_payload)
    assert grant_res.status_code == 201

    # Verify access immediately -> should be active
    verify_res = client.get("/api/v1/flexi-bill/entitlements/premium_reports/verify?customer_id=cust_micro_01")
    assert verify_res.status_code == 200
    assert verify_res.json()["is_entitled"] is True
    assert verify_res.json()["status"] == "active"

    # Verify ungranted feature -> should be False
    verify_neg = client.get("/api/v1/flexi-bill/entitlements/non_existent_feature/verify?customer_id=cust_micro_01")
    assert verify_neg.status_code == 200
    assert verify_neg.json()["is_entitled"] is False


def test_smart_consumption_optimizer(client, db_session):
    res = client.post(
        "/api/v1/flexi-bill/usage/optimize?customer_id=cust_opt_01&metric_name=api_calls&average_monthly_quantity=10000"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["customer_id"] == "cust_opt_01"
    assert Decimal(str(data["average_monthly_quantity"])) == Decimal("10000.0000")
    assert len(data["options_evaluated"]) == 4
    assert Decimal(str(data["potential_monthly_savings"])) >= Decimal("0.00")
    assert len(data["explanation"]) > 10

