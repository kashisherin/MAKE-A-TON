# KASHI domain rules and implementation decisions

## Financial invariants

- Monetary values use `Decimal` in Python and `NUMERIC` in SQL.
- Currency is explicit on every monetary record.
- Totals are computed server-side from immutable invoice-line snapshots.
- A finalized invoice is not silently edited; use credit notes/void workflows according to the platform's accounting policy.
- Payment allocations cannot exceed the payment amount or invoice outstanding amount unless an explicit unapplied-credit model is designed.
- Partial payments are supported; invoice status is derived from total, amount paid and due date.
- Every write endpoint that can create a financial effect needs an idempotency strategy.
- Financial operations use database transactions and appropriate row locking for PostgreSQL.
- Wallet ledger entries are append-only. Cached balance is a performance optimization and must be reconcilable from ledger entries.
- Refunds are separate ledger/payment events; do not mutate or delete original transactions.

## Invoice uniqueness

For subscription-generated invoices, define a stable billing-period identity:
`(subscription_id, billing_period_start, billing_period_end)`.
Use a database unique constraint as the final duplicate-prevention layer. A pre-insert query alone is not enough under concurrent jobs.

## Tax and discount ordering

The platform owner must explicitly decide:
1. Whether discounts apply before tax (common, but jurisdiction and product dependent).
2. Whether prices are tax-inclusive or tax-exclusive.
3. Whether line-level or invoice-level rounding is used.
4. How mixed tax rates and exemptions are represented.

Keep these rules configurable and documented. Do not hardcode GST percentages.

## PULSE score

Use an explainable, versioned scoring model. Return:
- score from 0 to 100
- risk band
- factors and their observed values
- factor weights and contribution
- missing-data notes
- model version and calculation timestamp

Do not infer churn from unavailable data. A missing signal should be marked unknown, not treated as healthy or unhealthy without an explicit rule.

## Integration boundaries

The main platform is expected to own canonical customer, organization, product, plan and subscription records. KASHI should reference their stable IDs and consume validated snapshots through adapters/contracts. Avoid copying those master tables into KASHI unless the team explicitly chooses a shared database model.
