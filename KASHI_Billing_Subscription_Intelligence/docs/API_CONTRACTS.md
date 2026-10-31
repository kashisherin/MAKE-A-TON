# Canonical API Contract Map – KASHI v1.0.0

Base path: `/api/v1`

| Domain Group | Endpoint | Method | Role Required | Purpose |
|---|---|---|---|---|
| **Invoices** | `/invoices/` | `POST` | `billing_specialist` | Create draft or subscription invoice |
| | `/invoices/` | `GET` | Authenticated | List & filter invoices by customer, subscription, status |
| | `/invoices/{id}` | `GET` | Authenticated | Detailed invoice view with lines and tax breakdowns |
| | `/invoices/{id}/finalize` | `POST` | `billing_specialist` | Finalize draft invoice to issued status |
| | `/invoices/{id}/void` | `POST` | `billing_specialist` | Controlled invoice void workflow |
| | `/invoices/{id}/pdf` | `GET` | Authenticated | Download ReportLab generated legal PDF tax invoice |
| **Taxes** | `/taxes/` | `POST` | `admin` | Create configurable tax rule (GST/VAT/Flat) |
| | `/taxes/` | `GET` | Authenticated | List active tax rules |
| | `/taxes/calculate` | `POST` | Authenticated | Preview tax calculation & component breakdowns |
| **Discounts** | `/discounts/` | `POST` | `admin` | Create discount rule or coupon |
| | `/discounts/` | `GET` | Authenticated | List discounts |
| | `/discounts/validate` | `POST` | Authenticated | Validate coupon against order with caps & min spend |
| **Payments** | `/payments/` | `POST` | `billing_specialist` | Record payment with idempotency & multi-allocations |
| | `/payments/` | `GET` | Authenticated | List payments |
| | `/payments/{id}` | `GET` | Authenticated | Payment detail with allocations and refunds |
| | `/payments/{id}/refund` | `POST` | `admin` | Process full/partial refund without mutating payment |
| | `/payments/reconcile` | `POST` | `billing_specialist` | Reconcile provider records against database |
| **Billing** | `/billing/run` | `POST` | `admin` | Trigger automated recurring billing run |
| | `/billing/runs` | `GET` | Authenticated | List billing execution history |
| | `/billing/runs/{id}` | `GET` | Authenticated | Billing run detail with per-subscription event logs |
| **FLEXI-BILL** | `/flexi-bill/wallets` | `POST` | `billing_specialist` | Create prepaid wallet |
| | `/flexi-bill/wallets` | `GET` | Authenticated | List customer wallets |
| | `/flexi-bill/wallets/{id}` | `GET` | Authenticated | Wallet details & recent ledger transactions |
| | `/flexi-bill/wallets/{id}/credit` | `POST` | `billing_specialist` | Concurrency-safe credit to wallet ledger |
| | `/flexi-bill/wallets/{id}/debit` | `POST` | `billing_specialist` | Concurrency-safe debit with overdraft protection |
| | `/flexi-bill/wallets/{id}/reconcile` | `GET` | `auditor` | Audit verify cached balance against ledger sum |
| | `/flexi-bill/usage/rules` | `POST` | `admin` | Create metered pricing rule (flat/tiered/volume) |
| | `/flexi-bill/usage/rules` | `GET` | Authenticated | List active usage pricing rules |
| | `/flexi-bill/usage/events` | `POST` | Authenticated | Ingest metered usage event with auto-wallet deduction |
| | `/flexi-bill/usage/events` | `GET` | Authenticated | Query usage events |
| | `/flexi-bill/usage/optimize` | `POST` | Authenticated | Smart Consumption Optimizer (PAYG vs Prepaid vs Monthly vs Annual) |
| | `/flexi-bill/entitlements` | `POST` | `billing_specialist` | Grant entitlement / temporary micro-subscription |
| | `/flexi-bill/entitlements` | `GET` | Authenticated | List entitlements |
| | `/flexi-bill/entitlements/{feature_key}/verify` | `GET` | Authenticated | High-performance feature access verification |
| **PULSE** | `/pulse/utilization` | `POST` | `billing_specialist` | Record seat utilization observation snapshot |
| | `/pulse/utilization` | `GET` | Authenticated | List utilization records |
| | `/pulse/savings` | `GET` | Authenticated | Detect idle licenses & calculate waste |
| | `/pulse/recommendations/generate` | `POST` | `billing_specialist` | Generate evidence-backed renewal recommendations |
| | `/pulse/recommendations` | `GET` | Authenticated | List optimization & right-sizing recommendations |
| | `/pulse/health-score/{customer_id}` | `GET` | Authenticated | Explainable 0–100 Revenue Health Score |
| **Analytics** | `/analytics/revenue` | `GET` | Authenticated | Invoiced, collected, outstanding & MRR/ARR metrics |
| | `/analytics/outstanding` | `GET` | Authenticated | Overdue aging report (Current, 1-30, 31-60, 61-90, 90+) |
| | `/analytics/collections` | `GET` | Authenticated | Monthly collections trend |
| | `/analytics/wallet-liabilities` | `GET` | Authenticated | Total deferred revenue / customer deposits in wallets |
| | `/analytics/reliability/{customer_id}` | `GET` | Authenticated | Customer payment reliability indicator (0-100 rating) |
