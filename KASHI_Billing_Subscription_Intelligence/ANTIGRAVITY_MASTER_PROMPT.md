# ANTIGRAVITY MASTER PROMPT – KASHI

You are the senior engineer responsible for implementing KASHI – Billing, Payments & Subscription Intelligence – inside this repository.

## Non-negotiable first step: inspect before coding

1. Inspect this entire repository and identify what is already implemented.
2. If this folder is inside a larger/main project, inspect the main project too.
3. Identify the existing backend framework, database, authentication, tenant model, customer/org/product/plan/subscription models, migrations, API conventions, test commands and code style.
4. Do not replace the host project's stack or architecture.
5. If this is the standalone KASHI starter, continue with FastAPI + SQLAlchemy 2.x + PostgreSQL-compatible schema.
6. Produce `docs/IMPLEMENTATION_PLAN.md` with discovered facts, assumptions, dependencies, proposed changes, file ownership and phases.
7. Do not ask repeated questions. Ask only if a missing decision blocks safe implementation. Otherwise record a conservative assumption and continue.

## Product goal

Build a complete, reliable financial subsystem, not a set of placeholder CRUD endpoints.

KASHI owns:
- Invoice generation and lifecycle
- Tax rules and automatic tax calculation
- Fixed and percentage discounts
- Payment recording, allocations, refunds and reconciliation
- Scheduled recurring billing
- Outstanding and overdue management
- FLEXI-BILL wallet, micro-subscriptions, usage billing and entitlements
- Smart Consumption Optimizer
- PULSE subscription utilization and savings detection
- Renewal recommendations
- Explainable Revenue Health Score
- Financial audit integration
- Finance and usage analytics

## Architecture and integration

Keep KASHI modular and integration-ready. The main platform may own canonical Customer, Organization, Product, Plan, Subscription, Identity and Notification domains.

- Do not duplicate canonical master data.
- Use stable external IDs and adapters/contracts.
- Keep business logic in service/domain modules, not route handlers.
- Keep framework-specific code at the API and persistence boundaries.
- Provide API contracts and integration documentation.
- Respect the host project's authentication, authorization, tenancy and error conventions.
- If main project is not present, use mock adapters only for local development and clearly isolate them.

## Financial correctness

- Use Decimal and SQL NUMERIC for all money. Never use float for monetary values.
- Include currency on monetary records.
- Compute all prices/taxes/discounts server-side.
- Document rounding and discount/tax ordering.
- Preserve invoice snapshots and finalized invoice history.
- Use database transactions for all financial writes.
- Use idempotency keys for payment, wallet and billing operations.
- Prevent duplicate subscription-period invoices with a database uniqueness constraint.
- Use PostgreSQL row locking or another concurrency-safe approach for wallet debits and payment allocations.
- Do not allow wallet overdrafts unless an explicit policy permits them.
- Wallet ledger is append-only; cached balance must reconcile to ledger.
- Refunds are new events, never destructive edits to original payment records.
- Never store card number, CVV or payment secrets.
- Audit logs must not contain credentials or sensitive payment data.

## Functional implementation

### 1. Invoices
Implement draft, issued, partially_paid, paid, overdue, void/cancelled lifecycle; unique invoice numbers; invoice lines; snapshots; due dates; PDF export; billing-period uniqueness; history; payment allocations.

### 2. Taxes
Configurable fixed/percentage tax rules, jurisdiction/product/customer applicability, exemptions, inclusive/exclusive pricing and tax breakdowns. Support GST components such as CGST, SGST and IGST through configuration, not hardcoded rates.

### 3. Discounts
Fixed and percentage discounts, coupons, start/end dates, redemption limits, product/plan eligibility, recurring and one-time discounts, minimum spend and maximum discount. Prevent negative totals and duplicate redemption.

### 4. Payments
Record full and partial payments, multiple allocations, provider references, payment states, failures, refunds and reconciliation. Keep provider integration behind an interface. Validate allocations and idempotency.

### 5. Billing automation
Build a scheduler/background job that discovers subscriptions due for billing, calculates billing periods, creates invoices, handles trial conversion and proration if required, records each run, retries transient failures and is safe under repeated/concurrent execution. A manual run endpoint must be protected.

### 6. Overdue management
Calculate outstanding balances and overdue days, record reminder events, expose filters and reports. Do not cancel subscriptions automatically unless a configurable policy and main-platform integration explicitly authorize it.

### 7. FLEXI-BILL
Implement customer wallets, immutable transaction ledger, atomic credit/debit/refund, idempotency, time-based access, usage-priced purchases, usage events, limits, digital entitlements, activation/suspension/revocation/expiry, verification APIs and automatic expiry processing.

### 8. Smart Consumption Optimizer
Compare pay-as-you-go, prepaid packs and subscription tiers using actual pricing and historical usage. Return assumptions, current spend, alternative spend, projected savings and a plain-language explanation. Start rule-based; do not claim unsupported savings.

### 9. PULSE
Track purchased, assigned, active and actually used accounts/add-ons. Identify unused capacity, duplicate or underused subscriptions, estimate evidence-backed savings, and produce renewal/downgrade/right-size recommendations with supporting facts, estimated impact and confidence.

### 10. Revenue Health Score
Create a deterministic, versioned and explainable 0–100 score using available signals such as utilization decline, usage frequency, payment failures, overdue invoices, downgrade events, spending decline and renewal proximity. Return risk band, factor values, weights, contributions, missing-data notes and recommended retention action. Missing data must not be silently treated as a negative or positive signal.

### 11. Audit and analytics
Record actor, action, entity, timestamp, correlation/request ID and safe before/after changes. Expose revenue, outstanding, collections, subscription spend and usage analytics with clearly defined metric semantics.

## Testing

Write unit, integration and API tests for:
- Tax/discount arithmetic and rounding
- Invoice lifecycle and duplicate billing
- Full/partial/multiple payments, allocation, refunds
- Concurrent wallet debit and insufficient balance
- Duplicate idempotency requests
- Usage pricing and limits
- Entitlement activation and expiry
- Billing retries and repeated scheduler runs
- PULSE utilization, savings, recommendations and score explanations
- Audit event creation and tenant isolation

Use an isolated test database. Never run destructive tests against production data. Add regression tests for every bug.

## Security and quality

- Authentication and role/tenant authorization on every relevant endpoint.
- Validate all input.
- Enforce organization-level data isolation.
- Use safe database access and parameterized queries.
- Add pagination/filtering and consistent errors.
- Do not expose stack traces or secrets.
- Add structured logs and correlation IDs.
- Add migrations, OpenAPI docs and environment example.
- No critical TODOs, fake success responses or production mock data.
- Do not claim completion unless the implementation and tests prove it.

## Phased execution

Phase 0: inspect repo, write implementation plan and integration contracts.
Phase 1: domain models, migrations, money/tax/discount calculation.
Phase 2: invoice lifecycle and payment allocations.
Phase 3: recurring billing, overdue management and retries.
Phase 4: FLEXI-BILL wallet ledger, usage and entitlements.
Phase 5: PULSE utilization, savings, recommendations and health score.
Phase 6: audit, finance analytics, security hardening.
Phase 7: integration tests, API docs, setup guide and final verification.

After each phase:
1. Run relevant tests.
2. Fix failures before continuing.
3. Update implementation status.
4. Document API/schema changes and integration dependencies.
5. Report exact files changed and commands/results.

## Final acceptance

The module must start, migrate, expose working APIs, calculate money accurately, prevent duplicate financial effects, support partial payments, maintain a reconcilable wallet ledger, process usage and entitlements, generate explainable PULSE results, audit financial changes, pass tests and provide a clear main-project integration guide.

Start now with repository inspection and Phase 0. Do not immediately generate large amounts of code before understanding the project.
