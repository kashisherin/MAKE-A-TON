from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")

def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)

def percentage_amount(base: Decimal, rate_percent: Decimal) -> Decimal:
    if base < 0 or rate_percent < 0:
        raise ValueError("Base and rate must be non-negative")
    return money(base * rate_percent / Decimal("100"))
