from decimal import Decimal
import pytest


def test_pulse_utilization_and_savings_detection(client, db_session):
    # 1. Record utilization: 100 purchased, 80 assigned, 60 active, only 45 actually used
    util_payload = {
        "subscription_id": "sub_pulse_101",
        "customer_id": "cust_pulse_org",
        "purchased_units": 100,
        "assigned_units": 80,
        "active_units": 60,
        "actually_used_units": 45,
        "observation_days": 30,
    }
    util_res = client.post("/api/v1/pulse/utilization", params=util_payload)
    assert util_res.status_code == 201
    util_data = util_res.json()
    assert util_data["unused_units"] == 55
    assert Decimal(str(util_data["utilization_percentage"])) == Decimal("45.00")

    # 2. Run savings analysis
    savings_res = client.get("/api/v1/pulse/savings")
    assert savings_res.status_code == 200
    savings_data = savings_res.json()
    assert Decimal(str(savings_data["total_potential_monthly_savings"])) > Decimal("0.00")
    assert len(savings_data["opportunities"]) >= 1
    opp = savings_data["opportunities"][0]
    assert opp["category"] == "unused_licenses"
    assert opp["wasted_units"] == 55

    # 3. Generate recommendations
    rec_res = client.post("/api/v1/pulse/recommendations/generate")
    assert rec_res.status_code == 200
    recs = rec_res.json()
    assert len(recs) >= 1
    right_size_rec = next(r for r in recs if r["subscription_id"] == "sub_pulse_101")
    assert right_size_rec["recommendation_type"] == "right_size"
    assert "idle seats" in right_size_rec["reason"]
    assert Decimal(str(right_size_rec["confidence_score"])) > Decimal("0")


def test_revenue_health_score_calculation(client, db_session):
    # Calculate health score for a customer
    res = client.get("/api/v1/pulse/health-score/cust_pulse_org")
    assert res.status_code == 200
    data = res.json()
    assert data["customer_id"] == "cust_pulse_org"
    assert Decimal("0.00") <= Decimal(str(data["score"])) <= Decimal("100.00")
    assert data["risk_category"] in ("healthy", "moderate_risk", "high_risk", "critical")
    assert len(data["factors"]) == 4
    assert len(data["retention_guidance"]) > 5
    assert data["calculation_version"] == "1.0.0"
