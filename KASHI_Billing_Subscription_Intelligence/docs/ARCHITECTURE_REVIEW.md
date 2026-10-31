# KASHI ARCHITECTURAL REVIEW & SUBSYSTEM ASSESSMENT

**Document Version:** 1.0.0  
**Date:** October 31, 2026  
**Author:** Principal Software Architect & Financial Systems Engineer  
**Status:** Approved for Implementation  

---

## 1. Executive Summary

This architecture review critically evaluates the initial starter package for **KASHI – Billing, Payments & Subscription Intelligence** located in `KASHI_Billing_Subscription_Intelligence`. 

KASHI is designed as the financial backbone and subscription intelligence engine of an enterprise SaaS subscription management platform. The initial codebase is an early-stage scaffold containing foundational SQLAlchemy models, minimal Pydantic schemas, and placeholder API endpoints. It lacks core business logic, transactional integrity guarantees, tax/discount calculation engines, payment allocation workflows, recurring billing schedulers, wallet concurrency controls, digital entitlement lifecycle management, explainable PULSE intelligence, audit trails, and multi-tenant isolation.

This document establishes the architectural baseline, identifies structural and financial vulnerabilities, defines concrete database and domain improvements, outlines integration contracts with host systems, and lays out the step-by-step implementation blueprint.

---

## 2. Existing Architecture Assessment

### 2.1 Technology Stack Analysis
- **Framework:** FastAPI (0.141.x) with Starlette (1.7.x) and Pydantic v2 (2.13.x).
- **ORM & Persistence:** SQLAlchemy 2.1.x with synchronous engine and sessions (`SessionLocal`).
- **Database Target:** SQLite configured by default (`sqlite:///./kashi_dev.db`) with PostgreSQL connection string capabilities (`postgresql+psycopg://...`).
- **Testing:** Pytest 9.2.x with FastAPI `TestClient` / HTTPX.
- **Reporting & Documents:** ReportLab 5.1.x (for PDF generation).

### 2.2 Directory & Module Structure
The initial structure organizes code into:
```text
KASHI_Billing_Subscription_Intelligence/
├── app/
│   ├── api/v1/endpoints/  # Invoices, payments, flexibill, pulse, analytics
│   ├── core/              # Config (pydantic-settings), database engine
│   ├── integrations/      # Protocol stubs for SubscriptionProvider & UsageProvider
│   ├── models/            # Single financial.py with 6 initial tables
│   ├── schemas/           # money.py
│   ├── services/          # money.py
│   └── main.py            # App entrypoint & /health route
├── docs/                  # API_CONTRACTS.md, DOMAIN_RULES.md, ANTIGRAVITY_MASTER_PROMPT.md
└── tests/                 # test_health.py
```

### 2.3 What Is Already Implemented
1. **Application Shell & Health Check:** Basic FastAPI startup, `/health` route, versioned API router mount `/api/v1`.
2. **Foundational Money Utilities:** `money()` quantizer (`Decimal("0.01")`, `ROUND_HALF_UP`) and `percentage_amount()`.
3. **Pydantic Money Input Schema:** Normalized positive decimal validation.
4. **Initial Database Models:**
   - `Invoice` and `InvoiceLine` with `uq_invoice_subscription_period` unique constraint.
   - `Payment` with idempotency key and invoice foreign key.
   - `Wallet` with `cached_balance` and `WalletTransaction`.
   - `AuditLog` table with entity snapshot columns.
5. **Initial Integration Protocols:** `SubscriptionSnapshot`, `SubscriptionProvider`, and `UsageProvider` typing protocols.

---

## 3. Identified Weaknesses & Structural Deficiencies

### 3.1 Financial Invariants & Concurrency Risks
1. **Wallet Overdraft & Race Conditions:**
   - The starter lacks concurrency controls (`with_for_update`) during wallet debits. Concurrent requests could debit the wallet simultaneously, causing negative balances (overdrafts).
   - No ledger reconciliation method exists to verify whether `cached_balance` matches `SUM(transactions)`.
2. **Direct Payment-to-Invoice 1:1 Coupling:**
   - The `Payment` model has a direct `invoice_id` foreign key. In real financial systems, one payment can be allocated across multiple invoices, or held as unapplied credit, or partially allocated. A dedicated `PaymentAllocation` entity is required.
3. **Refund Destructiveness Risk:**
   - There is no `Refund` model. Without an explicit refund entity, developers might be tempted to mutate payment amounts or invoice records directly, violating accounting audit standards.
4. **Float Poisoning Vulnerability:**
   - While `financial.py` uses `Numeric(18, 2)`, the API endpoint stubs do not validate inputs, risking floating-point numbers leaking into financial calculations.
5. **No Finalized Invoice Immutability:**
   - No mechanism exists to freeze invoices once issued. Modifying an issued invoice invalidates previous tax filings, customer receipts, and financial audit integrity.

### 3.2 Missing Domain Entities
1. **Taxation:** No `TaxRule` or `InvoiceTaxBreakdown` entities. No distinction between intra-state (CGST + SGST) and inter-state (IGST) in Indian GST, nor support for VAT/Sales Tax jurisdiction rules.
2. **Discounts & Coupons:** No `Discount` or `DiscountRedemption` entities. No limits on coupon usage, expiration, minimum order amount, or stacking protection.
3. **Billing Runs & Retries:** No `BillingRun` or `BillingRunItem` entity to log scheduled runs, track errors, and handle exponential backoff retries.
4. **Usage Billing:** No `UsagePricingRule` or `UsageEvent` models for metered consumption tracking and rating.
5. **Digital Entitlements:** No `Entitlement` entity to manage feature access, activation, expiration, or suspension.
6. **PULSE Intelligence Storage:** No tables to store historical seat utilization snapshots, evidence-based recommendations, or explainable Revenue Health Scores.

### 3.3 Security, Multi-Tenancy & Authorization Deficiencies
1. **Lack of Tenant Scoping:** Queries across models do not enforce `organization_id` boundaries, creating a critical multi-tenant data leakage vulnerability.
2. **Missing Authentication/Role Checks:** All API routers lack authentication dependencies (`get_current_user`, `require_role`).
3. **No Webhook Signature Verification:** Payment endpoints lack webhook verification architecture for providers (e.g. Stripe, Razorpay).

---

## 4. Proposed Architectural Improvements

### 4.1 Modular Domain Architecture
Refactor KASHI into domain-driven modules adhering to clean architecture:

```text
KASHI/
├── app/
│   ├── api/
│   │   ├── deps.py               # Auth, tenant context, DB session, pagination
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── invoices.py
│   │       │   ├── taxes.py
│   │       │   ├── discounts.py
│   │       │   ├── payments.py
│   │       │   ├── billing.py
│   │       │   ├── wallets.py
│   │       │   ├── usage.py
│   │       │   ├── entitlements.py
│   │       │   ├── pulse.py
│   │       │   └── analytics.py
│   │       └── router.py
│   ├── core/
│   │   ├── config.py             # Typed settings, security secrets, defaults
│   │   ├── database.py           # Engine, SessionLocal, Base
│   │   └── security.py           # Tenant context, auth token validation, roles
│   ├── domain/
│   │   ├── invoicing/            # Invoice calculation, state machine, PDF generation
│   │   ├── taxation/             # Jurisdiction-aware tax engine (GST/VAT/Flat)
│   │   ├── discounts/            # Coupon, percentage, fixed, stacking validator
│   │   ├── payments/             # Allocations, refunds, provider adapters, reconciliation
│   │   ├── billing/              # Recurring billing engine, proration, retry strategy
│   │   ├── overdue/              # Aging buckets, reminder policies, credit scoring
│   │   ├── wallet/               # Concurrency-safe ledger, overdraft guard, reconciliation
│   │   ├── usage/                # Event ingestion, deduplication, rating engine
│   │   ├── entitlements/         # Access grants, verification, auto-expiry
│   │   ├── pulse/                # Utilization, savings, recommendations, Revenue Health Score
│   │   └── audit/                # Structured financial change auditing
│   ├── models/                   # Complete SQLAlchemy 2.x declarative models
│   ├── schemas/                  # Pydantic v2 request/response DTOs
│   ├── integrations/             # Mock & production adapters for host platform
│   └── workers/                  # Background jobs (billing runner, entitlement expiry, overdue detector)
├── alembic/                      # Database migrations
├── docs/                         # Comprehensive architectural and API documentation
└── tests/                        # Unit, integration, and API end-to-end tests
```

---

## 5. Detailed Database Improvements

### 5.1 New & Enhanced Entities

| Table Name | Purpose & Key Attributes |
|---|---|
| `tax_rules` | Configurable tax rates (percentage/fixed), jurisdiction (country, state), tax code (CGST, SGST, IGST, VAT), priority, tax-inclusive flag, active dates. |
| `invoice_tax_breakdowns` | Line/invoice level breakdown recording tax rule name, rate, taxable amount, and calculated tax amount. |
| `discounts` | Fixed/percentage rules, coupon codes, expiration dates, max redemption counts, min order values, product/plan scope. |
| `discount_redemptions` | Immutable log of redemptions per customer/invoice with timestamp and idempotency key. |
| `invoices` | Enhanced with `tax_id`/GSTIN, billing address snapshot, place of supply, finalized_at, voided_at, subtotal, discount, tax, total, amount_paid, outstanding_balance, payment status. |
| `invoice_lines` | Enhanced with product ID, plan ID, period start/end, tax rule references, discount references, unit price, quantity. |
| `payments` | Provider reference, idempotency key, gross amount, currency, status (`recorded`, `cleared`, `failed`, `refunded`), method (`card`, `upi`, `netbanking`, `wallet`). |
| `payment_allocations` | Connects a payment to one or more invoices with allocated amounts, preventing over-allocation. |
| `refunds` | Separate ledger entity tracking refund reason, payment ID, amount, provider refund ID, status. |
| `billing_runs` | Scheduled/manual billing execution log: execution time, subscriptions processed, invoices created, failures, status (`running`, `completed`, `failed`). |
| `billing_events` | Granular per-subscription billing attempt log with error messages and retry counts. |
| `wallets` | Enhanced with `status` (`active`, `frozen`, `closed`), `organization_id`, spending limit, and expiration date. |
| `wallet_transactions` | Immutable ledger with `balance_after`, transaction type (`credit`, `debit`, `refund`, `adjustment`), correlation ID, reference. |
| `usage_pricing_rules` | Tiered, flat, and volume consumption pricing for features/products (e.g. API calls, AI tokens). |
| `usage_events` | Metered event ingestion log with deduplication key, customer ID, metric name, quantity, recorded timestamp. |
| `entitlements` | Digital access grants with feature key, customer ID, status (`active`, `suspended`, `expired`, `revoked`), expires_at. |
| `utilization_records` | PULSE tracking of purchased vs assigned vs active vs used seats/add-ons per subscription. |
| `pulse_recommendations` | Evidence-backed recommendations (renew, downgrade, upgrade, right-size) with estimated savings and confidence. |
| `revenue_health_scores` | Versioned, explainable 0–100 score records with constituent factor weights, risk category, and retention guidance. |
| `audit_logs` | Immutable audit trail capturing actor, entity, action, before/after JSON states, and correlation ID. |

---

## 6. Financial Logic & Calculation Invariants

1. **Precision & Rounding:**
   - All arithmetic uses `Decimal`.
   - Division operations use explicit precision (minimum 6 decimal places intermediate) before final 2-decimal rounding with `ROUND_HALF_UP`.
2. **Order of Operations:**
   - `Line Subtotal = Quantity × Unit Price`
   - `Line Discount = Calculated based on applicable rule (fixed or percentage)`
   - `Taxable Line Base = Line Subtotal - Line Discount`
   - `Line Tax = Taxable Line Base × Tax Rate%` (for tax-exclusive) OR extracted via `Taxable Base = Line Total / (1 + Tax Rate%)` (for tax-inclusive).
   - `Line Total = Taxable Line Base + Line Tax`
   - `Invoice Subtotal = Sum(Line Subtotal)`
   - `Invoice Discount Total = Sum(Line Discount) + Order-level Discount`
   - `Invoice Tax Total = Sum(Line Tax)`
   - `Invoice Grand Total = Invoice Subtotal - Invoice Discount Total + Invoice Tax Total`
   - **Constraint:** `Invoice Grand Total >= 0.00`. Discounts can never create a negative balance or cash outflow.
3. **Indian GST Rules:**
   - Intra-state (Supplier State == Customer Place of Supply): Split equally into CGST (50% of rate) and SGST (50% of rate).
   - Inter-state (Supplier State != Customer Place of Supply) or Export: IGST (100% of rate).

---

## 7. Security & Isolation Improvements

1. **Tenant Context & Scoping:**
   - Every API request must supply or resolve an authenticated `organization_id`.
   - Every database query in repositories/services must include `filter(Model.organization_id == org_id)`.
2. **Concurrency Safety:**
   - Wallet balance updates use PostgreSQL `SELECT ... FOR UPDATE` (or SQLite serialized lock fallback in dev).
   - Balance verification checks: `current_balance >= debit_amount`. Overdraft is blocked with `InsufficientFundsError`.
3. **Idempotency Strategy:**
   - Financial endpoints require an `Idempotency-Key` header.
   - Idempotency records track request hash and cached response to guarantee duplicate execution safety.
4. **Credential Isolation:**
   - Zero storage of card PANs, CVVs, or bank credentials. Only provider reference tokens (e.g., `pay_xxxx`, `ch_xxxx`) are persisted.

---

## 8. Integration Requirements with Main Platform

KASHI acts as a financial subsystem. It interfaces with:
1. **Identity & Auth Module:** Validates JWT/bearer tokens and provides `actor_id` and `organization_id`.
2. **Subscription & Plan Module:** Provides billable subscription snapshots (`SubscriptionSnapshot`) with billing intervals, recurring prices, and trial statuses.
3. **Customer & Organization Module:** Provides customer billing profiles, GSTIN/tax IDs, addresses, and currency preferences.
4. **Usage Ingestion Module:** Pushes real-time consumption events or syncs aggregated usage counters.
5. **Notification Module:** Dispatches invoice PDFs, payment reminders, and low-wallet-balance alerts.

---

## 9. Recommended Implementation Order

The implementation will follow a rigorous phased sequence:
1. **Phase 1: Architecture, Core Schemas & Database Models** (Complete models, migrations, money & tax engine).
2. **Phase 2: Complete Invoicing & Payment Engine** (Invoice state machine, PDF export, multi-payment allocation, refunds).
3. **Phase 3: Recurring Billing & Overdue Management** (Scheduler worker, proration, aging analysis, reminder policies).
4. **Phase 4: FLEXI-BILL Consumption Engine** (Ledger-backed wallet, micro-subscriptions, usage rating, entitlements).
5. **Phase 5: PULSE Subscription Intelligence** (Utilization analytics, evidence-backed savings, explainable Revenue Health Score).
6. **Phase 6: Financial Audit & Analytics** (Audit trail capture, MRR/ARR, invoiced vs collected revenue analytics).
7. **Phase 7: Security Hardening, API Routes & Comprehensive Testing** (Tenant isolation, auth dependencies, end-to-end integration tests, setup docs).

---
*End of Architectural Review.*

