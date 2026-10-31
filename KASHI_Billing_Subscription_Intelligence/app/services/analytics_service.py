from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.models.financial import (
    Invoice,
    Payment,
    Refund,
    Wallet,
    WalletTransaction,
)
from app.schemas.analytics import (
    RevenueMetricsResponse,
    CollectionsTrendResponse,
    CollectionsTrendItem,
    WalletLiabilitiesResponse,
)
from app.services.money import money, CENT


class FinanceAnalyticsService:
    @classmethod
    def get_revenue_metrics(
        cls,
        db: Session,
        organization_id: str,
    ) -> RevenueMetricsResponse:
        # Invoiced revenue: sum of total for all non-void invoices
        invoiced_stmt = select(func.sum(Invoice.total)).where(
            and_(
                Invoice.organization_id == organization_id,
                Invoice.status != "void",
            )
        )
        total_invoiced = db.scalar(invoiced_stmt) or Decimal("0.00")

        # Collected cash: sum of cleared payments
        collected_stmt = select(func.sum(Payment.amount)).where(
            and_(
                Payment.organization_id == organization_id,
                Payment.status.in_(["cleared", "refunded"]),
            )
        )
        total_collected = db.scalar(collected_stmt) or Decimal("0.00")

        # Outstanding revenue: sum of outstanding balance on open invoices
        outstanding_stmt = select(func.sum(Invoice.outstanding_balance)).where(
            and_(
                Invoice.organization_id == organization_id,
                Invoice.status.in_(["issued", "partially_paid", "overdue"]),
            )
        )
        total_outstanding = db.scalar(outstanding_stmt) or Decimal("0.00")

        # Refunded amount
        refunded_stmt = select(func.sum(Refund.amount)).where(
            and_(
                Refund.organization_id == organization_id,
                Refund.status == "completed",
            )
        )
        total_refunded = db.scalar(refunded_stmt) or Decimal("0.00")

        net_collected = max(Decimal("0.00"), total_collected - total_refunded)

        # Approximate MRR from active monthly subscription billing
        mrr_stmt = select(func.sum(Invoice.subtotal)).where(
            and_(
                Invoice.organization_id == organization_id,
                Invoice.status != "void",
                Invoice.subscription_id.is_not(None),
            )
        )
        recurring_billed = db.scalar(mrr_stmt) or Decimal("0.00")
        estimated_mrr = (recurring_billed).quantize(CENT)
        estimated_arr = (estimated_mrr * Decimal("12.00")).quantize(CENT)

        definitions = {
            "total_invoiced_revenue": "Total value of all finalized legal tax invoices issued (excluding voided invoices).",
            "total_collected_cash": "Gross cash received through payment gateways and confirmed transactions.",
            "net_collected_revenue": "Gross collected cash minus processed refunds.",
            "total_outstanding_revenue": "Receivables due from customers on issued and overdue invoices.",
            "estimated_mrr": "Approximate monthly recurring billing base from active subscription contracts.",
            "estimated_arr": "Annualized recurring run-rate (MRR × 12).",
        }

        return RevenueMetricsResponse(
            currency="INR",
            total_invoiced_revenue=total_invoiced,
            total_collected_cash=total_collected,
            total_outstanding_revenue=total_outstanding,
            total_refunded_amount=total_refunded,
            net_collected_revenue=net_collected,
            estimated_mrr=estimated_mrr,
            estimated_arr=estimated_arr,
            metric_definitions=definitions,
        )

    @classmethod
    def get_collections_trend(
        cls,
        db: Session,
        organization_id: str,
    ) -> CollectionsTrendResponse:
        payments = db.scalars(
            select(Payment).where(
                and_(
                    Payment.organization_id == organization_id,
                    Payment.status.in_(["cleared", "refunded"]),
                )
            ).order_by(Payment.created_at.asc())
        ).all()

        monthly_map: dict[str, dict] = {}
        total_collected = Decimal("0.00")

        for pmt in payments:
            month_key = pmt.created_at.strftime("%Y-%m")
            if month_key not in monthly_map:
                monthly_map[month_key] = {"amount": Decimal("0.00"), "count": 0}
            monthly_map[month_key]["amount"] += pmt.amount
            monthly_map[month_key]["count"] += 1
            total_collected += pmt.amount

        items = [
            CollectionsTrendItem(
                period=k,
                amount_collected=v["amount"],
                transaction_count=v["count"],
            )
            for k, v in sorted(monthly_map.items())
        ]

        return CollectionsTrendResponse(
            currency="INR",
            total_collected=total_collected,
            trends=items,
        )

    @classmethod
    def get_wallet_liabilities(
        cls,
        db: Session,
        organization_id: str,
    ) -> WalletLiabilitiesResponse:
        wallets = db.scalars(
            select(Wallet).where(
                and_(
                    Wallet.organization_id == organization_id,
                    Wallet.status == "active",
                )
            )
        ).all()

        total_liability = sum((w.cached_balance for w in wallets), Decimal("0.00"))

        return WalletLiabilitiesResponse(
            currency="INR",
            total_active_wallets=len(wallets),
            total_wallet_liability_balance=total_liability,
            unreconciled_wallets_count=0,
            note="Prepaid wallet balances represent deferred revenue and an unearned customer liability until consumed via metered usage.",
        )

