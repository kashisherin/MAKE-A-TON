from decimal import Decimal, ROUND_HALF_UP
from app.schemas.usage import (
    ConsumptionOptimizationResponse,
    ConsumptionOption,
)
from app.services.money import money, CENT


class SmartConsumptionOptimizer:
    """
    Evaluates customer consumption facts and compares alternative commercial models:
    1. Pure Pay-As-You-Go (PAYG)
    2. Prepaid Credit Pack (10% to 20% discount on volume credits)
    3. Monthly Fixed Subscription Tier (fixed quota + overage rate)
    4. Annual Fixed Subscription Tier (annual discount)
    """

    @classmethod
    def optimize_consumption(
        cls,
        customer_id: str,
        metric_name: str,
        average_monthly_quantity: Decimal,
        base_unit_price: Decimal = Decimal("0.0500"),  # e.g., Rs 0.05 per API call
        current_model: str = "Pay-As-You-Go",
    ) -> ConsumptionOptimizationResponse:
        qty = max(Decimal("0.0000"), average_monthly_quantity)

        # 1. Option 1: Pay-As-You-Go
        payg_cost = (qty * base_unit_price).quantize(CENT, rounding=ROUND_HALF_UP)
        payg_option = ConsumptionOption(
            model_name="Pay-As-You-Go",
            estimated_monthly_cost=payg_cost,
            effective_unit_cost=base_unit_price,
            breakdown_notes=f"{qty} units @ {base_unit_price} / unit",
        )

        # 2. Option 2: Prepaid Credit Pack (15% bulk discount)
        prepaid_unit_rate = (base_unit_price * Decimal("0.85")).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        prepaid_cost = (qty * prepaid_unit_rate).quantize(CENT, rounding=ROUND_HALF_UP)
        prepaid_option = ConsumptionOption(
            model_name="Prepaid Volume Pack",
            estimated_monthly_cost=prepaid_cost,
            effective_unit_cost=prepaid_unit_rate,
            breakdown_notes=f"Prepaid pack with 15% discount @ {prepaid_unit_rate} / unit",
        )

        # 3. Option 3: Monthly Fixed Tier (e.g., Rs 300/mo includes 8,000 units, excess @ base_unit_price)
        included_monthly_units = Decimal("8000.0000")
        tier_base_fee = Decimal("300.00")
        excess_qty = max(Decimal("0.0000"), qty - included_monthly_units)
        monthly_tier_cost = tier_base_fee + (excess_qty * base_unit_price).quantize(CENT, rounding=ROUND_HALF_UP)
        monthly_effective_unit = (monthly_tier_cost / qty).quantize(Decimal("0.0001")) if qty > 0 else base_unit_price
        monthly_option = ConsumptionOption(
            model_name="Monthly Subscription Tier",
            estimated_monthly_cost=monthly_tier_cost,
            effective_unit_cost=monthly_effective_unit,
            breakdown_notes=f"Fixed base {tier_base_fee} (includes 8,000 units) + {excess_qty} overage units",
        )

        # 4. Option 4: Annual Subscription Tier (e.g. Rs 2,880/year = Rs 240/month, includes 8,000 units/mo)
        annual_amortized_fee = Decimal("240.00")
        annual_tier_cost = annual_amortized_fee + (excess_qty * (base_unit_price * Decimal("0.80"))).quantize(CENT, rounding=ROUND_HALF_UP)
        annual_effective_unit = (annual_tier_cost / qty).quantize(Decimal("0.0001")) if qty > 0 else base_unit_price
        annual_option = ConsumptionOption(
            model_name="Annual Subscription Tier",
            estimated_monthly_cost=annual_tier_cost,
            effective_unit_cost=annual_effective_unit,
            breakdown_notes=f"Amortized annual base {annual_amortized_fee}/mo + discounted 20% overage rate",
        )

        options = [payg_option, prepaid_option, monthly_option, annual_option]

        # Determine current cost based on current_model
        current_cost = payg_cost
        for opt in options:
            if opt.model_name.lower() == current_model.lower():
                current_cost = opt.estimated_monthly_cost

        # Find best option
        best_option = min(options, key=lambda x: x.estimated_monthly_cost)
        potential_savings = max(Decimal("0.00"), current_cost - best_option.estimated_monthly_cost)
        savings_percentage = (
            (potential_savings / current_cost * Decimal("100.00")).quantize(Decimal("0.01"))
            if current_cost > 0 else Decimal("0.00")
        )

        if potential_savings > Decimal("0.00"):
            explanation = (
                f"Based on historical consumption of {qty} {metric_name}/month, switching from "
                f"{current_model} ({current_cost} INR/mo) to {best_option.model_name} ({best_option.estimated_monthly_cost} INR/mo) "
                f"saves {potential_savings} INR/month ({savings_percentage}% reduction)."
            )
        else:
            explanation = f"Customer is already on the most optimal pricing plan ({current_model})."

        return ConsumptionOptimizationResponse(
            customer_id=customer_id,
            metric_name=metric_name,
            average_monthly_quantity=qty,
            current_model=current_model,
            current_estimated_cost=current_cost,
            recommended_model=best_option.model_name,
            recommended_cost=best_option.estimated_monthly_cost,
            potential_monthly_savings=potential_savings,
            savings_percentage=savings_percentage,
            options_evaluated=options,
            explanation=explanation,
        )

