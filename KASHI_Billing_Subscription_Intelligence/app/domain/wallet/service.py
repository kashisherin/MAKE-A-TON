from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException, status

from app.models.financial import Wallet, WalletTransaction, utc_now
from app.schemas.wallets import (
    WalletCreate,
    WalletCreditInput,
    WalletDebitInput,
    WalletReconciliationResponse,
)
from app.core.security import TenantContext
from app.domain.audit.service import AuditService
from app.services.money import money, CENT


class WalletService:
    @classmethod
    def get_or_create_wallet(
        cls,
        db: Session,
        customer_id: str,
        organization_id: str,
        currency: str = "INR",
        spending_limit: Decimal | None = None,
    ) -> Wallet:
        wallet = db.scalar(
            select(Wallet).where(
                and_(
                    Wallet.customer_id == customer_id,
                    Wallet.organization_id == organization_id,
                )
            )
        )
        if not wallet:
            wallet = Wallet(
                customer_id=customer_id,
                organization_id=organization_id,
                currency=currency.upper(),
                cached_balance=Decimal("0.00"),
                spending_limit=spending_limit,
                status="active",
            )
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
        return wallet

    @classmethod
    def credit_wallet(
        cls,
        db: Session,
        wallet_id: int,
        data: WalletCreditInput,
        ctx: TenantContext,
    ) -> WalletTransaction:
        # 1. Idempotency check
        existing_tx = db.scalar(
            select(WalletTransaction).where(WalletTransaction.idempotency_key == data.idempotency_key)
        )
        if existing_tx:
            return existing_tx

        # 2. Concurrency-safe row lock
        # In SQLite with_for_update() is a no-op; in PostgreSQL it locks the row.
        stmt = select(Wallet).where(
            and_(
                Wallet.id == wallet_id,
                Wallet.organization_id == ctx.organization_id,
            )
        ).with_for_update()
        wallet = db.scalar(stmt)
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        if wallet.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot credit wallet with status '{wallet.status}'.",
            )

        credit_amt = data.amount.quantize(CENT)
        if credit_amt <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Credit amount must be greater than zero.")

        new_balance = wallet.cached_balance + credit_amt
        wallet.cached_balance = new_balance

        tx = WalletTransaction(
            wallet_id=wallet.id,
            idempotency_key=data.idempotency_key,
            transaction_type="credit",
            amount=credit_amt,
            balance_after=new_balance,
            currency=wallet.currency,
            reference=data.reference,
            description=data.description,
            actor_id=ctx.actor_id,
        )
        db.add(tx)

        AuditService.record_event(
            db=db,
            entity_type="Wallet",
            entity_id=str(wallet.id),
            action="CREDIT_WALLET",
            actor_id=ctx.actor_id,
            organization_id=ctx.organization_id,
            after_state={"amount": str(credit_amt), "balance_after": str(new_balance)},
        )

        db.commit()
        db.refresh(tx)
        return tx

    @classmethod
    def debit_wallet(
        cls,
        db: Session,
        wallet_id: int,
        data: WalletDebitInput,
        ctx: TenantContext,
    ) -> WalletTransaction:
        # 1. Idempotency check
        existing_tx = db.scalar(
            select(WalletTransaction).where(WalletTransaction.idempotency_key == data.idempotency_key)
        )
        if existing_tx:
            return existing_tx

        # 2. Concurrency-safe row lock
        stmt = select(Wallet).where(
            and_(
                Wallet.id == wallet_id,
                Wallet.organization_id == ctx.organization_id,
            )
        ).with_for_update()
        wallet = db.scalar(stmt)
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        if wallet.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot debit wallet with status '{wallet.status}'.",
            )

        debit_amt = data.amount.quantize(CENT)
        if debit_amt <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Debit amount must be greater than zero.")

        # Strict Overdraft Prevention
        if wallet.cached_balance < debit_amt:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient wallet funds. Current balance: {wallet.cached_balance}, required: {debit_amt}.",
            )

        if wallet.spending_limit is not None and debit_amt > wallet.spending_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Transaction amount {debit_amt} exceeds wallet spending limit {wallet.spending_limit}.",
            )

        new_balance = wallet.cached_balance - debit_amt
        wallet.cached_balance = new_balance

        tx = WalletTransaction(
            wallet_id=wallet.id,
            idempotency_key=data.idempotency_key,
            transaction_type="debit",
            amount=debit_amt,
            balance_after=new_balance,
            currency=wallet.currency,
            reference=data.reference,
            description=data.description,
            actor_id=ctx.actor_id,
        )
        db.add(tx)

        AuditService.record_event(
            db=db,
            entity_type="Wallet",
            entity_id=str(wallet.id),
            action="DEBIT_WALLET",
            actor_id=ctx.actor_id,
            organization_id=ctx.organization_id,
            after_state={"amount": str(debit_amt), "balance_after": str(new_balance)},
        )

        db.commit()
        db.refresh(tx)
        return tx

    @classmethod
    def reconcile_wallet(
        cls,
        db: Session,
        wallet_id: int,
        ctx: TenantContext,
    ) -> WalletReconciliationResponse:
        wallet = db.scalar(
            select(Wallet).where(
                and_(
                    Wallet.id == wallet_id,
                    Wallet.organization_id == ctx.organization_id,
                )
            )
        )
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        transactions = db.scalars(
            select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id).order_by(WalletTransaction.id)
        ).all()

        computed_sum = Decimal("0.00")
        for tx in transactions:
            if tx.transaction_type in ("credit", "refund"):
                computed_sum += tx.amount
            elif tx.transaction_type in ("debit", "adjustment"):
                computed_sum -= tx.amount

        discrepancy = wallet.cached_balance - computed_sum
        is_reconciled = (discrepancy == Decimal("0.00"))

        return WalletReconciliationResponse(
            wallet_id=wallet.id,
            cached_balance=wallet.cached_balance,
            ledger_sum=computed_sum,
            is_reconciled=is_reconciled,
            discrepancy=discrepancy,
            total_transactions_checked=len(transactions),
        )

