import json
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.models.financial import (
    UsageEvent,
    UsagePricingRule,
    Wallet,
    utc_now,
)
from app.schemas.usage import UsageEventIngestInput
from app.schemas.wallets import WalletDebitInput
from app.domain.wallet.service import WalletService
from app.core.security import TenantContext
from app.services.money import money, CENT


class UsageBillingService:
    @classmethod
    def calculate_cost(
        cls,
        pricing_rule: UsagePricingRule,
        quantity: Decimal,
    ) -> Decimal:
        if quantity <= Decimal("0.0000"):
            return Decimal("0.00")

        if pricing_rule.model_type == "flat":
            cost = quantity * pricing_rule.unit_price
            return cost.quantize(CENT, rounding=ROUND_HALF_UP)

        elif pricing_rule.model_type == "tiered":
            # Graduated tiers, e.g. [{"up_to": 1000, "price": 0.05}, {"up_to": 5000, "price": 0.03}, {"up_to": None, "price": 0.02}]
            if not pricing_rule.tiers_json:
                return (quantity * pricing_rule.unit_price).quantize(CENT, rounding=ROUND_HALF_UP)
            tiers = json.loads(pricing_rule.tiers_json)
            total_cost = Decimal("0.00")
            remaining_qty = quantity
            last_bracket = Decimal("0.00")

            for tier in tiers:
                bracket_cap = Decimal(str(tier["up_to"])) if tier.get("up_to") is not None else None
                tier_price = Decimal(str(tier["price"]))

                if bracket_cap is None:
                    total_cost += remaining_qty * tier_price
                    remaining_qty = Decimal("0.00")
                    break
                else:
                    bracket_size = bracket_cap - last_bracket
                    allocated = min(remaining_qty, bracket_size)
                    total_cost += allocated * tier_price
                    remaining_qty -= allocated
                    last_bracket = bracket_cap
                    if remaining_qty <= Decimal("0.00"):
                        break

            return total_cost.quantize(CENT, rounding=ROUND_HALF_UP)

        elif pricing_rule.model_type == "volume":
            # Volume pricing: all units priced at the rate of the reached tier
            if not pricing_rule.tiers_json:
                return (quantity * pricing_rule.unit_price).quantize(CENT, rounding=ROUND_HALF_UP)
            tiers = json.loads(pricing_rule.tiers_json)
            effective_price = pricing_rule.unit_price
            for tier in tiers:
                bracket_cap = Decimal(str(tier["up_to"])) if tier.get("up_to") is not None else None
                if bracket_cap is None or quantity <= bracket_cap:
                    effective_price = Decimal(str(tier["price"]))
                    break
            return (quantity * effective_price).quantize(CENT, rounding=ROUND_HALF_UP)

        return (quantity * pricing_rule.unit_price).quantize(CENT, rounding=ROUND_HALF_UP)

    @classmethod
    def ingest_event(
        cls,
        db: Session,
        data: UsageEventIngestInput,
        ctx: TenantContext,
    ) -> UsageEvent:
        org_id = data.organization_id or ctx.organization_id

        # 1. Deduplication by idempotency key
        existing = db.scalar(
            select(UsageEvent).where(UsageEvent.idempotency_key == data.idempotency_key)
        )
        if existing:
            return existing

        now = data.event_timestamp or utc_now()
        event = UsageEvent(
            organization_id=org_id,
            customer_id=data.customer_id,
            metric_name=data.metric_name,
            quantity=data.quantity,
            idempotency_key=data.idempotency_key,
            event_timestamp=now,
            billed_status="unbilled",
        )
        db.add(event)
        db.flush()

        # 2. Automated wallet deduction if requested
        if data.auto_debit_wallet:
            rule = db.scalar(
                select(UsagePricingRule).where(
                    and_(
                        UsagePricingRule.metric_name == data.metric_name,
                        UsagePricingRule.is_active.is_(True),
                    )
                )
            )
            if rule:
                cost = cls.calculate_cost(rule, data.quantity)
                if cost > Decimal("0.00"):
                    wallet = WalletService.get_or_create_wallet(
                        db=db,
                        customer_id=data.customer_id,
                        organization_id=org_id,
                    )
                    debit_tx = WalletService.debit_wallet(
                        db=db,
                        wallet_id=wallet.id,
                        data=WalletDebitInput(
                            amount=cost,
                            idempotency_key=f"usage_debit_{event.idempotency_key}",
                            reference=f"usage_event_{event.id}",
                            description=f"Auto-debit for {data.quantity} {data.metric_name}",
                        ),
                        ctx=ctx,
                    )
                    event.billed_status = "billed"
                    event.wallet_transaction_id = debit_tx.id

        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def get_customer_usage_summary(
        cls,
        db: Session,
        customer_id: str,
        metric_name: str,
    ) -> Decimal:
        stmt = select(func.sum(UsageEvent.quantity)).where(
            and_(
                UsageEvent.customer_id == customer_id,
                UsageEvent.metric_name == metric_name,
            )
        )
        return db.scalar(stmt) or Decimal("0.0000")

