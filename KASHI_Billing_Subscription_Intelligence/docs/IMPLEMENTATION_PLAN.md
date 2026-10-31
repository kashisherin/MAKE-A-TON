# KASHI IMPLEMENTATION PLAN & TECHNICAL BLUEPRINT

**Version:** 1.0.0  
**Phase:** Phase 0 (Planning to Execution)  
**Target Completion:** Production-Ready Subsystem  

---

## 1. Discovered Facts & Baseline
- **Location:** `KASHI_Billing_Subscription_Intelligence` within `D:\SUBSCRIPTION MANAGEMENT`.
- **Environment:** Windows PowerShell, Python 3.12.10.
- **Dependencies Installed:** FastAPI, Uvicorn, SQLAlchemy 2.1.x, Pydantic v2, Pydantic Settings, Alembic 1.20.x, Pytest 9.2.x, ReportLab 5.1.x.
- **Verification Mode:** Test runs involving `TestClient` / async loopback sockets run cleanly with `BypassSandbox: true` due to Windows socketpair sandbox isolation rules.

---

## 2. Core Architectural Decisions & Invariants
1. **Financial Monies:** `Decimal` everywhere; 2 decimal places for currency representations (`0.01`), 4 decimal places for unit prices/quantities.
2. **Immutable Ledgers:** Wallet transactions are append-only. Cached wallet balance is verified and reconcilable against the transaction ledger.
3. **Idempotency:** Unique constraints on idempotency keys and subscription billing periods `(subscription_id, billing_period_start, billing_period_end)`.
4. **State Transitions:** Invoices transition strictly via state machine: `draft` -> `issued` -> `partially_paid` -> `paid` (or `overdue`, `void`).
5. **Separation of Concerns:**
   - Routes: Request parsing, dependency injection, response formatting.
   - Domain/Services: Pure business rules, calculation logic, orchestration.
   - Repositories/Models: Persistence and queries.
   - Workers: Background scheduled tasks.

---

## 3. Work Breakdown & Implementation Phases

### Phase 1: Establish Domain Models & Database Architecture
- Create complete SQLAlchemy models in `app/models/financial.py`:
  - `TaxRule`, `InvoiceTaxBreakdown`
  - `Discount`, `DiscountRedemption`
  - `Invoice`, `InvoiceLine`, `Payment`, `PaymentAllocation`, `Refund`
  - `BillingRun`, `BillingEvent`
  - `Wallet`, `WalletTransaction`
  - `UsagePricingRule`, `UsageEvent`
  - `Entitlement`
  - `UtilizationRecord`, `PulseRecommendation`, `RevenueHealthScore`
  - `AuditLog`
- Configure Alembic and generate initial migration.
- Build Pydantic schemas in `app/schemas/` for all entities.
- Implement Pure Domain Tax Engine (`app/domain/taxation/engine.py`) supporting Indian GST (CGST/SGST/IGST) and flat/percentage rates.
- Implement Pure Domain Discount Engine (`app/domain/discounts/engine.py`) supporting coupon validation, caps, and stacking rules.

### Phase 2: Invoicing, Payments & Financial Core
- Implement Invoice Service (`app/services/invoice_service.py`):
  - Line item addition, tax/discount calculation, totals recalculation.
  - State machine transitions (`finalize`, `void`, `mark_overdue`).
  - Idempotency and duplicate subscription billing checks.
  - Invoice PDF Generation (`app/services/pdf_service.py`) via ReportLab.
- Implement Payment & Refund Service (`app/services/payment_service.py`):
  - Payment recording with idempotency.
  - Multi-invoice payment allocation.
  - Status updates (`recorded` -> `cleared` -> `refunded`).
  - Refund creation with provider reference.
  - Provider integration adapter interface (`StripePaymentAdapter`, `RazorpayPaymentAdapter`).

### Phase 3: Automated Recurring Billing & Overdue Management
- Implement Recurring Billing Engine (`app/domain/billing/engine.py`):
  - Discover billable subscriptions via `SubscriptionProvider`.
  - Calculate billing periods (monthly, quarterly, annual).
  - Prorated calculations where upgrades/downgrades occur.
  - Record `BillingRun` and `BillingEvent` with error tracking.
- Implement Overdue & Aging Engine (`app/domain/overdue/engine.py`):
  - Calculate aging buckets (Current, 1-30, 31-60, 61-90, 90+ days).
  - Schedule reminders and evaluate customer reliability score.

### Phase 4: FLEXI-BILL: Wallets, Usage, Entitlements & Optimizer
- Implement Concurrency-Safe Wallet Service (`app/domain/wallet/service.py`):
  - Atomic credit, debit, refund, adjustment.
  - Row-level lock (`with_for_update`) to prevent race conditions and overdrafts.
  - Concurrency ledger reconciliation test (`cached_balance == sum(ledger)`).
- Implement Usage Metering & Rating Engine (`app/domain/usage/service.py`):
  - Ingestion with deduplication.
  - Rating rules (tiered, flat, volume).
  - Automated wallet deduction.
- Implement Digital Entitlements Engine (`app/domain/entitlements/service.py`):
  - Grant, activate, suspend, revoke, verify access.
  - Background expiry worker.
- Implement Smart Consumption Optimizer (`app/domain/consumption/optimizer.py`):
  - Compare Pay-as-you-go, Prepaid packs, Monthly, and Annual subscriptions.
  - Transparent formula explanations and concrete savings numbers.

### Phase 5: PULSE Subscription Intelligence
- Implement Utilization Tracking (`app/domain/pulse/utilization.py`):
  - Purchased vs assigned vs active vs actually used seats.
  - Configurable inactivity observation windows (e.g. 14, 30, 60 days).
- Implement Savings Detection (`app/domain/pulse/savings.py`):
  - Calculate real waste from idle licenses, oversized plans, and duplicate subscriptions.
- Implement Renewal Recommendations (`app/domain/pulse/recommendations.py`):
  - Evidence-backed actions (renew, downgrade, right-size, switch to flexi).
  - Confidence scoring and financial impact.
- Implement Explainable Revenue Health Score (`app/domain/pulse/health_score.py`):
  - Deterministic 0–100 score with transparent factor weights.
  - Signal decay, payment failure impact, usage trends, and retention guidance.

### Phase 6: Financial Audit & Analytics
- Implement Audit Logging Service (`app/domain/audit/service.py`):
  - Before/after JSON snapshots, actor attribution, correlation ID tracking.
- Implement Finance Analytics Service (`app/services/analytics_service.py`):
  - Invoiced Revenue, Collected Revenue, Outstanding/Overdue Balances.
  - Monthly Recurring Revenue (MRR) approximations.
  - Wallet liability reporting (deferred revenue).

### Phase 7: REST API Endpoints, Security Hardening & Testing
- Implement and mount API routers in `app/api/v1/endpoints/`:
  - `/invoices`, `/taxes`, `/discounts`, `/payments`, `/billing`, `/wallets`, `/usage`, `/entitlements`, `/pulse`, `/analytics`.
- Implement Security & Tenant Context middleware/dependencies (`app/core/security.py`).
- Implement comprehensive test suites in `tests/`:
  - Unit tests for money, tax, discount calculations.
  - Concurrency tests for wallet balance updates.
  - Integration tests for invoice lifecycle, recurring billing, payments, and refunds.
  - PULSE intelligence validation tests.
  - Cross-tenant security tests.

