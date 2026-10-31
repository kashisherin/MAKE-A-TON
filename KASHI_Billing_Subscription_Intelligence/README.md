# KASHI – Billing, Payments & Subscription Intelligence Subsystem

**Production-Grade Financial Engine & Subscription Intelligence Backbone**

---

## 1. Overview

KASHI is the financial backbone and subscription intelligence subsystem of an enterprise SaaS subscription management platform. Built using **FastAPI**, **SQLAlchemy 2.x**, **Pydantic v2**, and **PostgreSQL-compatible schema**, it delivers uncompromising financial precision, transactional safety, multi-tenant isolation, and explainable subscription intelligence.

### Key Capabilities
- **Invoice Lifecycle Engine:** Draft -> Issued -> Partially Paid -> Paid -> Overdue -> Void state machine, ReportLab PDF generation, immutable historical snapshots, and database-level duplicate billing prevention.
- **Configurable Taxation:** Jurisdiction-aware tax calculations supporting Indian GST (Intra-state CGST + SGST vs Inter-state IGST), VAT, Sales Tax, tax-inclusive/exclusive pricing, and exemptions.
- **Discount & Coupon Engine:** Fixed and percentage discounts with minimum order thresholds, maximum caps, redemption limits, effective date windows, and non-negative total guarantees.
- **Provider-Agnostic Payment Engine:** Multi-invoice payment allocation, strict idempotency enforcement, non-destructive refund event tracking, and automated gateway reconciliation.
- **Recurring Billing Automation:** Scheduled billing runs, billing period tracking, proration calculations, and audit logging.
- **Overdue Management & Aging:** Aging buckets (Current, 1-30, 31-60, 61-90, 90+ days) and customer payment reliability scoring (0–100 rating).
- **FLEXI-BILL Flexible Consumption:**
  - **Prepaid Wallet Ledger:** Append-only ledger, row-level locking (`with_for_update`), strict overdraft protection, and automated reconciliation against cached balances.
  - **Usage-Based Rating:** Flat, tiered (graduated), and volume consumption pricing with automatic wallet deductions.
  - **Digital Entitlements & Micro-Subscriptions:** Access granting with configurable duration (1-hour, 24-hour, 7-day temporary access), sub-millisecond verification, and background expiry workers.
  - **Smart Consumption Optimizer:** Rule-based comparative analysis evaluating Pay-As-You-Go, Prepaid Packs, Monthly, and Annual commitments with transparent savings explanations.
- **PULSE Subscription Intelligence:**
  - Utilization analytics (purchased vs assigned vs active vs actually used seats).
  - Evidence-backed savings detection for idle licenses and duplicate subscriptions.
  - Proactive renewal and right-sizing recommendations.
  - Explainable Revenue Health Score (0–100) with factor weighting and explicit missing signal reporting.
- **Financial Audit & Analytics:** Sanitized before/after audit trails, separate reporting for invoiced revenue, collected cash, outstanding receivables, MRR/ARR run-rates, and wallet liabilities (deferred revenue).

---

## 2. Technology Stack

- **Runtime:** Python 3.12+
- **Framework:** FastAPI 0.141+
- **ORM:** SQLAlchemy 2.1+ (sync sessions with declarative models)
- **Data Validation:** Pydantic v2 / pydantic-settings
- **Database Migrations:** Alembic 1.20+
- **PDF Generation:** ReportLab 5.1+
- **Test Suite:** Pytest 9.2+ with FastAPI TestClient

---

## 3. Directory Layout

```text
KASHI_Billing_Subscription_Intelligence/
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection: Auth, Tenant Context, DB Session
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── invoices.py   # Invoicing & PDF generation routes
│   │       │   ├── taxes.py      # Tax rule management & preview
│   │       │   ├── discounts.py  # Discount management & validation
│   │       │   ├── payments.py   # Payments, allocations, refunds, reconciliation
│   │       │   ├── billing.py    # Recurring billing execution & run history
│   │       │   ├── flexibill.py  # Wallets, usage metering, entitlements, optimizer
│   │       │   ├── pulse.py      # Utilization, savings, recommendations, health score
│   │       │   └── analytics.py  # Financial KPIs, aging reports, reliability score
│   │       └── router.py         # Versioned API router aggregation
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings configuration
│   │   ├── database.py           # Engine, SessionLocal, Base, init_db()
│   │   └── security.py           # TenantContext & UserRole definitions
│   ├── domain/
│   │   ├── audit/                # Structured financial change auditing
│   │   ├── billing/              # Recurring billing engine & proration
│   │   ├── consumption/          # Smart Consumption Optimizer
│   │   ├── discounts/            # Discount & coupon validation engine
│   │   ├── entitlements/         # Digital entitlements & micro-subscriptions
│   │   ├── overdue/              # Aging buckets & customer reliability indicator
│   │   ├── pulse/                # PULSE intelligence, utilization, recommendations, health score
│   │   ├── taxation/             # Jurisdiction-aware tax engine (Indian GST / VAT)
│   │   ├── usage/                # Metered consumption rating & wallet deduction
│   │   └── wallet/               # Concurrency-safe ledger & overdraft guard
│   ├── integrations/             # Protocol contracts for host platform adapters
│   ├── models/                   # 20 SQLAlchemy declarative financial entities
│   ├── schemas/                  # Pydantic v2 request/response DTOs
│   ├── services/                 # Orchestration services (Invoices, Payments, Analytics, PDF)
│   ├── workers/                  # Scheduled background workers (Billing, Entitlement expiry)
│   └── main.py                   # FastAPI application entrypoint & health check
├── alembic/                      # Database migrations
├── docs/                         # Architecture review, implementation plan, integration contracts
├── tests/                        # Comprehensive test suite (33 passing automated tests)
├── alembic.ini                   # Alembic configuration
├── requirements.txt              # Production & test dependencies
└── README.md
```

---

## 4. Setup & Running Locally

### 1. Configure Virtual Environment & Dependencies
```powershell
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure Environment
```powershell
Copy-Item .env.example .env
```
Default `.env` configures local SQLite (`sqlite:///./kashi_dev.db`). For PostgreSQL:
```env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/kashi
```

### 3. Run Database Migrations
```powershell
alembic upgrade head
```

### 4. Start the Application
```powershell
uvicorn app.main:app --reload
```

Interactive API Documentation:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`
- **Health Check:** `http://127.0.0.1:8000/health`

---

## 5. Running the Automated Test Suite

The test suite runs against an isolated, high-speed in-memory database with static connection pooling and automatic rollback:

```powershell
$env:PYTHONPATH="KASHI_Billing_Subscription_Intelligence"
pytest KASHI_Billing_Subscription_Intelligence/tests -v
```

**Results:** `33 passed in 0.58s`

---

## 6. Financial Correctness Invariants

1. **Monetary Precision:** Always use `Decimal` with explicit rounding modes (`ROUND_HALF_UP`). Binary floating-point math is strictly forbidden.
2. **Immutable Wallet Ledger:** Cached wallet balances are verified against `SUM(transactions)`. Overdrafts are blocked at the transactional boundary.
3. **Idempotency:** Unique keys on payments, refunds, wallet transactions, and usage events guarantee duplicate-execution safety.
4. **Subscription Period Uniqueness:** The database unique constraint `uq_invoice_subscription_period` prevents double-invoicing for any subscription billing period.
5. **Non-Destructive Refunds:** Refunds are recorded as separate immutable records that adjust invoice balances without mutating original payment receipts.
6. **Zero Sensitive Credential Persistence:** Card numbers, CVVs, and payment secrets are never stored.

---

## 7. Documentation Index

- `docs/ARCHITECTURE_REVIEW.md`: Detailed system assessment, database improvements, and design decisions.
- `docs/IMPLEMENTATION_PLAN.md`: Phased execution blueprint and technical specifications.
- `docs/IMPLEMENTATION_STATUS.md`: Complete milestone verification dashboard.
- `docs/API_CONTRACTS.md`: Canonical endpoint mapping, methods, required roles, and parameters.
- `docs/INTEGRATION_CONTRACTS.md`: Data contracts with host Customer, Subscription, and Usage platforms.
- `docs/SECURITY_CHECKLIST.md`: Financial security and audit compliance checklist.
