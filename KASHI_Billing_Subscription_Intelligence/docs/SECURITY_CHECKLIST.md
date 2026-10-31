# KASHI Financial Security & Hardening Checklist

**Subsystem:** KASHI Financial Backbone  
**Review Status:** Verified & Enforced  

---

- [x] **Authentication & Role Authorization:** Every financial write endpoint enforces role checks (`admin`, `billing_specialist`, `auditor`).
- [x] **Tenant Scoping on Queries:** Queries are strictly filtered by `organization_id` to guarantee tenant isolation.
- [x] **Zero Card/Credential Storage:** Card numbers, CVVs, and banking secrets are never stored. Only external provider transaction references are preserved.
- [x] **Decimal Monetary Precision:** All monetary amounts use Python `Decimal` and SQL `NUMERIC(18, 2)` / `NUMERIC(18, 4)`. Floating point math is strictly forbidden.
- [x] **Concurrency & Overdraft Prevention:** Concurrency-safe updates (`with_for_update`) and pre-checks prevent wallet balances from dropping below zero.
- [x] **Immutable Ledger Auditing:** Wallet transactions are append-only. Cached balances reconcile with `SUM(transactions)`.
- [x] **Idempotency Guarantees:** Payments, refunds, wallet credits/debits, and usage ingestion enforce unique idempotency keys.
- [x] **Duplicate Billing Safeguards:** Unique database constraint `uq_invoice_subscription_period` prevents double-invoicing for any subscription period.
- [x] **Finalized Invoice Immutability:** Finalized invoices cannot be altered. Changes require credit notes, refunds, or void workflows.
- [x] **Credential Scrubbing in Audit Logs:** `AuditService` sanitizes and redacts passwords, tokens, API keys, and sensitive data before logging.
- [x] **Database Isolation in Tests:** Automated test suite runs against isolated in-memory databases with automatic rollbacks.
- [x] **Tested Cross-Tenant Rejection:** Integration tests verify that users cannot access records belonging to other tenants.

