from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from app.services.money import money, CENT


@dataclass(frozen=True)
class DiscountValidationResult:
    is_valid: bool
    discount_amount: Decimal
    rejection_reason: str | None = None


class DiscountEngine:
    """
    Evaluates discount and coupon applicability with strict financial guarantees:
    - Minimum order amount validation
    - Expiration and effective date windows
    - Maximum redemption counts
    - Discount caps (maximum allowable discount value)
    - Product / plan scoping
    - Absolute guarantee against negative order totals
    """

    @classmethod
    def evaluate_discount(
        cls,
        discount_type: str,  # "percentage" or "fixed"
        discount_value: Decimal,
        order_amount: Decimal,
        min_order_amount: Decimal = Decimal("0.00"),
        max_discount_amount: Decimal | None = None,
        max_redemptions: int | None = None,
        current_redemption_count: int = 0,
        starts_at: datetime | None = None,
        expires_at: datetime | None = None,
        is_active: bool = True,
        as_of_time: datetime | None = None,
        eligible_product_id: str | None = None,
        request_product_id: str | None = None,
        eligible_plan_id: str | None = None,
        request_plan_id: str | None = None,
    ) -> DiscountValidationResult:
        now = as_of_time or datetime.now(timezone.utc)

        if not is_active:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason="Discount is inactive",
            )

        if starts_at and now < starts_at:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason="Discount is not yet active",
            )

        if expires_at and now > expires_at:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason="Discount has expired",
            )

        if max_redemptions is not None and current_redemption_count >= max_redemptions:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason="Discount redemption limit reached",
            )

        if order_amount < min_order_amount:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason=f"Order amount {order_amount} is below minimum requirement {min_order_amount}",
            )

        if eligible_product_id and request_product_id and eligible_product_id != request_product_id:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason="Discount is not eligible for this product",
            )

        if eligible_plan_id and request_plan_id and eligible_plan_id != request_plan_id:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason="Discount is not eligible for this plan",
            )

        # Calculate nominal discount amount
        if discount_type == "percentage":
            nominal_discount = (order_amount * discount_value / Decimal("100")).quantize(
                CENT, rounding=ROUND_HALF_UP
            )
        elif discount_type == "fixed":
            nominal_discount = discount_value.quantize(CENT, rounding=ROUND_HALF_UP)
        else:
            return DiscountValidationResult(
                is_valid=False,
                discount_amount=Decimal("0.00"),
                rejection_reason=f"Unknown discount type: {discount_type}",
            )

        # Apply maximum discount cap if configured
        if max_discount_amount is not None and nominal_discount > max_discount_amount:
            nominal_discount = max_discount_amount.quantize(CENT, rounding=ROUND_HALF_UP)

        # Financial invariant: Discount can never exceed the order amount
        final_discount = min(nominal_discount, order_amount)
        final_discount = max(Decimal("0.00"), final_discount)

        return DiscountValidationResult(
            is_valid=True,
            discount_amount=final_discount,
            rejection_reason=None,
        )

