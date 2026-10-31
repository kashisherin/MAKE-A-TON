from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict
from datetime import date, timedelta
from typing import Any

from .models import Invoice, InvoiceStatus, Payment, PaymentStatus, SubscriptionStatus, TwinState


class TwinEngine:
    """Deterministic Digital Twin engine. It never mutates the source state during simulation."""

    def __init__(self, state: TwinState):
        self.state = state

    def snapshot(self) -> TwinState:
        return deepcopy(self.state)

    @staticmethod
    def _maps(state: TwinState):
        return {
            "plans": {x.id: x for x in state.plans},
            "products": {x.id: x for x in state.products},
            "taxes": {x.id: x for x in state.taxes},
            "discounts": {x.id: x for x in state.discounts},
        }

    def calculate_subscription(self, state: TwinState, subscription_id: int) -> dict[str, Any]:
        maps = self._maps(state)
        sub = next(x for x in state.subscriptions if x.id == subscription_id)
        subtotal = 0.0
        tax = 0.0
        for line in sub.lines:
            unit_price = line.unit_price
            if line.variant_id:
                variant = next(v for p in state.products for v in p.variants if v.id == line.variant_id)
                unit_price += variant.price_adjustment
            line_total = unit_price * line.quantity
            subtotal += line_total
            if line.tax_rule_id:
                tax += line_total * maps["taxes"][line.tax_rule_id].rate

        discount_amount = 0.0
        if sub.discount_rule_id:
            rule = maps["discounts"][sub.discount_rule_id]
            product_id = sub.lines[0].product_id if sub.lines else 0
            if rule.is_eligible(state.as_of, subtotal, sum(x.quantity for x in sub.lines), product_id):
                discount_amount = subtotal * rule.value / 100 if rule.kind == "percentage" else rule.value
                discount_amount = min(discount_amount, subtotal)
                taxable_subtotal = subtotal - discount_amount
                tax = 0.0
                for line in sub.lines:
                    line_total = line.unit_price * line.quantity
                    tax += line_total * maps["taxes"][line.tax_rule_id].rate if line.tax_rule_id else 0.0
                tax = tax * (taxable_subtotal / subtotal) if subtotal else 0.0

        return {"subtotal": round(subtotal, 2), "discount": round(discount_amount, 2), "tax": round(tax, 2), "total": round(subtotal - discount_amount + tax, 2)}

    def metrics(self, state: TwinState | None = None) -> dict[str, Any]:
        state = state or self.state
        active = [s for s in state.subscriptions if s.status == SubscriptionStatus.ACTIVE and not s.paused]
        invoices = [i for i in state.invoices if i.status != InvoiceStatus.CANCELLED]
        return {
            "active_subscriptions": len(active),
            "total_invoiced": round(sum(i.total for i in invoices), 2),
            "collected_revenue": round(sum(i.paid_amount for i in invoices), 2),
            "outstanding_revenue": round(sum(i.balance_due for i in invoices), 2),
            "overdue_invoices": sum(1 for i in invoices if i.payment_status == PaymentStatus.OVERDUE and i.due_on < state.as_of),
            "overdue_amount": round(sum(i.balance_due for i in invoices if i.due_on < state.as_of and i.balance_due > 0), 2),
        }

    def generate_invoice(self, state: TwinState, subscription_id: int, invoice_id: int | None = None) -> Invoice:
        sub = next(x for x in state.subscriptions if x.id == subscription_id)
        if sub.status != SubscriptionStatus.ACTIVE or sub.paused:
            raise ValueError("Only active, non-paused subscriptions can be billed")
        if any(i.subscription_id == subscription_id and i.issued_on == state.as_of and i.status != InvoiceStatus.CANCELLED for i in state.invoices):
            raise ValueError("Duplicate billing prevented for this subscription and date")
        calc = self.calculate_subscription(state, subscription_id)
        invoice = Invoice(invoice_id or (max([i.id for i in state.invoices] or [0]) + 1), f"INV-{(invoice_id or max([i.id for i in state.invoices] or [0]) + 1):05d}", subscription_id, sub.customer_id, state.as_of, state.as_of + timedelta(days=30), InvoiceStatus.CONFIRMED, **calc)
        state.invoices.append(invoice)
        return invoice

    def record_payment(self, state: TwinState, invoice_id: int, method: str, amount: float, note: str = "") -> Payment:
        invoice = next(x for x in state.invoices if x.id == invoice_id)
        if amount <= 0 or amount > invoice.balance_due + 0.01:
            raise ValueError("Payment must be positive and cannot exceed invoice balance")
        payment = Payment(max([p.id for p in state.payments] or [0]) + 1, invoice_id, method, round(amount, 2), state.as_of, note)
        invoice.paid_amount = round(invoice.paid_amount + amount, 2)
        invoice.status = InvoiceStatus.PAID if invoice.balance_due <= 0 else InvoiceStatus.CONFIRMED
        state.payments.append(payment)
        return payment

    def simulate_price_change(self, plan_id: int, percent: float) -> dict[str, Any]:
        twin = self.snapshot()
        before = self.metrics(twin)
        plan = next(x for x in twin.plans if x.id == plan_id)
        plan.price = round(plan.price * (1 + percent / 100), 2)
        for sub in twin.subscriptions:
            if sub.plan_id == plan_id:
                for line in sub.lines:
                    line.unit_price = plan.price
                for invoice in twin.invoices:
                    if invoice.subscription_id == sub.id and invoice.status != InvoiceStatus.CANCELLED:
                        calc = self.calculate_subscription(twin, sub.id)
                        invoice.subtotal = calc["subtotal"]
                        invoice.discount = calc["discount"]
                        invoice.tax = calc["tax"]
                        invoice.total = calc["total"]
        after = self.metrics(twin)
        return {"scenario": f"price_change_{percent}%", "before": before, "after": after, "delta": self._delta(before, after), "affected_subscriptions": sum(1 for s in twin.subscriptions if s.plan_id == plan_id)}

    def simulate_discount(self, discount_id: int, percent: float) -> dict[str, Any]:
        twin = self.snapshot()
        before = self.metrics(twin)
        discount = next(x for x in twin.discounts if x.id == discount_id)
        discount.kind, discount.value = "percentage", percent
        for sub in twin.subscriptions:
            if sub.discount_rule_id == discount_id:
                # Recalculate an existing invoice for the scenario without changing live data.
                for invoice in twin.invoices:
                    if invoice.subscription_id == sub.id and invoice.status != InvoiceStatus.CANCELLED:
                        calc = self.calculate_subscription(twin, sub.id)
                        invoice.subtotal, invoice.discount, invoice.tax, invoice.total = calc.values()
        after = self.metrics(twin)
        return {"scenario": f"discount_{discount_id}_{percent}%", "before": before, "after": after, "delta": self._delta(before, after)}

    def risks(self, state: TwinState | None = None) -> list[dict[str, Any]]:
        state = state or self.state
        result = []
        for invoice in state.invoices:
            if invoice.balance_due > 0 and invoice.due_on < state.as_of:
                result.append({"type": "overdue_invoice", "invoice_id": invoice.id, "subscription_id": invoice.subscription_id, "severity": "high", "amount": invoice.balance_due, "recommendation": "Send payment reminder"})
        for discount in state.discounts:
            if discount.ends_on and 0 <= (discount.ends_on - state.as_of).days <= 30:
                result.append({"type": "discount_expiring", "discount_id": discount.id, "severity": "medium", "recommendation": "Review before next billing run"})
        return result

    def plan_collected_target(self, target: float) -> dict[str, Any]:
        metrics = self.metrics()
        current = metrics["collected_revenue"]
        gap = round(max(target - current, 0.0), 2)
        overdue = metrics["overdue_amount"]
        recovery = round(min(gap, overdue), 2)
        average_per_subscriber = round(current / max(metrics["active_subscriptions"], 1), 2)
        additional_subscribers = int((gap + average_per_subscriber - 1) // average_per_subscriber) if average_per_subscriber else 0
        return {
            "target_collected": round(target, 2),
            "current_collected": round(current, 2),
            "gap": gap,
            "outstanding_revenue": metrics["outstanding_revenue"],
            "overdue_revenue": overdue,
            "suggested_overdue_recovery": recovery,
            "remaining_gap_after_overdue_recovery": round(gap - recovery, 2),
            "average_collected_per_active_subscriber": average_per_subscriber,
            "additional_subscribers_needed": additional_subscribers,
            "recommendation": "Recover overdue invoices first, then use renewals, upgrades, or new sales to close the remaining gap." if gap else "The current collected revenue already meets the target.",
        }

    def billing_preview(self) -> dict[str, Any]:
        eligible = [s for s in self.state.subscriptions if s.status == SubscriptionStatus.ACTIVE and not s.paused and s.next_billing_date and s.next_billing_date <= self.state.as_of]
        already_billed = {i.subscription_id for i in self.state.invoices if i.issued_on == self.state.as_of and i.status != InvoiceStatus.CANCELLED}
        to_bill = [s for s in eligible if s.id not in already_billed]
        skipped = [s for s in eligible if s.id in already_billed]
        totals = [self.calculate_subscription(self.state, s.id)["total"] for s in to_bill]
        return {"eligible_subscriptions": len(eligible), "invoices_to_create": len(to_bill), "already_billed": len(skipped), "projected_revenue": round(sum(totals), 2), "duplicate_protection": len(skipped), "status": "ready_for_approval"}

    def renewal_forecast(self, days: int = 30) -> dict[str, Any]:
        cutoff = self.state.as_of + timedelta(days=days)
        upcoming = [s for s in self.state.subscriptions if s.status == SubscriptionStatus.ACTIVE and s.expiry_date and self.state.as_of <= s.expiry_date <= cutoff]
        return {"window_days": days, "renewals_due": len(upcoming), "estimated_renewal_value": round(sum(self.calculate_subscription(self.state, s.id)["total"] for s in upcoming), 2), "subscription_ids": [s.id for s in upcoming]}

    def upgrade_recommendations(self) -> list[dict[str, Any]]:
        results = []
        for s in self.state.subscriptions:
            if s.status != SubscriptionStatus.ACTIVE or not s.lines:
                continue
            quantity = sum(line.quantity for line in s.lines)
            if quantity >= 10:
                results.append({"subscription_id": s.id, "customer_id": s.customer_id, "current_quantity": quantity, "recommendation": "Review for enterprise or yearly upgrade", "reason": "High seat count"})
        return results

    @staticmethod
    def _delta(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
        keys = ["total_invoiced", "collected_revenue", "outstanding_revenue", "overdue_amount"]
        return {key: round(after[key] - before[key], 2) for key in keys}
