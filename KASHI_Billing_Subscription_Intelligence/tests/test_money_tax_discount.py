from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest

from app.services.money import money, percentage_amount
from app.domain.taxation.engine import TaxEngine
from app.domain.discounts.engine import DiscountEngine


def test_money_quantization():
    assert money(Decimal("100.004")) == Decimal("100.00")
    assert money(Decimal("100.005")) == Decimal("100.01")
    assert money(Decimal("100.006")) == Decimal("100.01")


def test_percentage_amount():
    assert percentage_amount(Decimal("1000.00"), Decimal("18.00")) == Decimal("180.00")
    assert percentage_amount(Decimal("500.00"), Decimal("9.00")) == Decimal("45.00")
    with pytest.raises(ValueError):
        percentage_amount(Decimal("-10.00"), Decimal("10.00"))


def test_tax_exclusive_calculation():
    base = Decimal("1000.00")
    rate = Decimal("18.00")
    tax = TaxEngine.calculate_tax_exclusive(base, rate)
    assert tax == Decimal("180.00")


def test_tax_inclusive_extraction():
    inclusive_total = Decimal("1180.00")
    rate = Decimal("18.00")
    taxable_base, tax = TaxEngine.extract_tax_inclusive(inclusive_total, rate)
    assert taxable_base == Decimal("1000.00")
    assert tax == Decimal("180.00")


def test_indian_gst_intra_state_split():
    # Supplier in KA, Customer in KA -> 9% CGST + 9% SGST
    base = Decimal("1000.00")
    rate = Decimal("18.00")
    breakdown = TaxEngine.calculate_gst_breakdown(
        taxable_amount=base,
        total_rate_percent=rate,
        place_of_supply="KA",
        supplier_state="KA",
    )
    assert len(breakdown) == 2
    cgst = next(b for b in breakdown if b.tax_code == "CGST")
    sgst = next(b for b in breakdown if b.tax_code == "SGST")
    assert cgst.rate_percent == Decimal("9.0000")
    assert cgst.tax_amount == Decimal("90.00")
    assert sgst.rate_percent == Decimal("9.0000")
    assert sgst.tax_amount == Decimal("90.00")


def test_indian_gst_inter_state_igst():
    # Supplier in KA, Customer in MH -> 18% IGST
    base = Decimal("1000.00")
    rate = Decimal("18.00")
    breakdown = TaxEngine.calculate_gst_breakdown(
        taxable_amount=base,
        total_rate_percent=rate,
        place_of_supply="MH",
        supplier_state="KA",
    )
    assert len(breakdown) == 1
    igst = breakdown[0]
    assert igst.tax_code == "IGST"
    assert igst.rate_percent == Decimal("18.0000")
    assert igst.tax_amount == Decimal("180.00")


def test_tax_exemption():
    res = TaxEngine.calculate_line_tax(
        line_subtotal=Decimal("1000.00"),
        discount_amount=Decimal("0.00"),
        applicable_rate_percent=Decimal("18.00"),
        is_inclusive=False,
        is_exempt=True,
        place_of_supply="KA",
    )
    assert res.tax_total == Decimal("0.00")
    assert res.grand_total == Decimal("1000.00")
    assert len(res.components) == 0


def test_discount_percentage_and_cap():
    order_amount = Decimal("2000.00")
    # 20% discount on 2000 = 400, but cap at 300
    res = DiscountEngine.evaluate_discount(
        discount_type="percentage",
        discount_value=Decimal("20.00"),
        order_amount=order_amount,
        max_discount_amount=Decimal("300.00"),
    )
    assert res.is_valid is True
    assert res.discount_amount == Decimal("300.00")


def test_discount_minimum_order_rejection():
    res = DiscountEngine.evaluate_discount(
        discount_type="fixed",
        discount_value=Decimal("50.00"),
        order_amount=Decimal("200.00"),
        min_order_amount=Decimal("500.00"),
    )
    assert res.is_valid is False
    assert "below minimum requirement" in res.rejection_reason


def test_discount_expiration():
    now = datetime.now(timezone.utc)
    res = DiscountEngine.evaluate_discount(
        discount_type="fixed",
        discount_value=Decimal("50.00"),
        order_amount=Decimal("1000.00"),
        expires_at=now - timedelta(days=1),
    )
    assert res.is_valid is False
    assert res.rejection_reason == "Discount has expired"


def test_discount_cannot_exceed_order_total():
    # Fixed discount 1500 on 1000 order -> discount is capped at 1000, never negative
    res = DiscountEngine.evaluate_discount(
        discount_type="fixed",
        discount_value=Decimal("1500.00"),
        order_amount=Decimal("1000.00"),
    )
    assert res.is_valid is True
    assert res.discount_amount == Decimal("1000.00")

