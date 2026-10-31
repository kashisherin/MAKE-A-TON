# KASHI Main-Platform Integration Contracts & Data Dictionary

**Version:** 1.0.0  
**Status:** Canonical Interface Specification  

---

## 1. Architectural Integration Principles

KASHI is designed as a modular financial and intelligence subsystem within a parent SaaS subscription platform.
The main platform remains the authoritative system of record for:
- Customers & Accounts
- Organizations / Tenants
- Products & Feature Catalog
- Subscription Plans & Contracts
- User Identity & Authentication

KASHI avoids duplicating master records. Instead, it maintains transactional records (invoices, payments, wallet ledgers, entitlements, audit logs) keyed to stable platform identifiers.

---

## 2. Canonical Identifiers

All cross-module references use opaque string identifiers:

| Identifier | Type | Platform Source Module | Description |
|---|---|---|---|
| `customer_id` | `String(128)` | Customer Management | Stable unique customer account identifier. |
| `organization_id` | `String(128)` | Multi-Tenant Management | Tenant partition boundary. Every financial write and read is scoped to this key. |
| `subscription_id` | `String(128)` | Subscription Management | Subscription contract ID being billed or tracked. |
| `product_id` | `String(128)` | Product Catalog | Specific product SKU reference. |
| `plan_id` | `String(128)` | Pricing / Plan Management | Commercial subscription tier reference (e.g. `plan_pro_annual`). |
| `actor_id` | `String(128)` | IAM / Auth | Authenticated user or system service principal responsible for the operation. |

---

## 3. Subscription Billing Snapshot Contract

When the recurring billing engine executes, it requests due subscriptions from the main platform's `SubscriptionProvider`:

```python
@dataclass(frozen=True)
class SubscriptionSnapshot:
    subscription_id: str
    customer_id: str
    organization_id: str | None
    plan_id: str
    status: str            # "active", "trialing", "past_due", "canceled"
    billing_interval: str  # "monthly", "quarterly", "annual"
    currency: str          # "INR", "USD", etc.
    price: Decimal         # Agreed recurring price snapshot
    price_version: str     # Version identifier for grandfathered pricing
    trial_status: str | None
```

### Uniqueness & Duplicate Billing Prevention
KASHI enforces a database uniqueness constraint:
`UNIQUE(subscription_id, billing_period_start, billing_period_end)`

Even under concurrent execution or retries, duplicate invoices cannot be generated for the same billing window.

---

## 4. Usage Consumption Events Contract

Metered features stream raw usage consumption events into `/api/v1/flexi-bill/usage/events`:

```json
{
  "customer_id": "cust_acme_corp",
  "metric_name": "ai_tokens",
  "quantity": "25000.0000",
  "idempotency_key": "evt_ai_20261031_0001",
  "event_timestamp": "2026-10-31T12:00:00Z",
  "auto_debit_wallet": true
}
```

- **Idempotency:** The `idempotency_key` guarantees that network retries or duplicate stream ingestion do not double-bill the customer.
- **Auto-Debit:** When `auto_debit_wallet=true`, the engine automatically computes charges via active `UsagePricingRule` and debits the customer's prepaid wallet atomically.

---

## 5. Security, Tenancy & Header Standards

All HTTP requests to KASHI must supply context headers:

| Header Name | Required | Default / Format | Description |
|---|---|---|---|
| `X-Organization-ID` | Yes (in prod) | `org_default` | Enforces tenant-level data segregation. |
| `X-User-ID` | Yes | `actor_default` | Audit actor attribution. |
| `X-User-Role` | Yes | `admin` \| `billing_specialist` \| `auditor` \| `customer` | Role-based authorization. |
| `X-Correlation-ID` | Optional | UUID string | End-to-end request tracing. |
| `Idempotency-Key` | Conditional | Unique string | Required on all financial write operations (payments, wallet credits/debits, refunds). |

---

## 6. Payment Gateway Integration Contract

Payment webhooks and provider transactions interface through `PaymentService`:
- Payment confirms only after backend verification or webhook signature verification.
- Provider reference (e.g. `ch_stripe_xxx` or `pay_razorpay_xxx`) is stored with a unique index.
- Refunds produce separate immutable `Refund` records; original payments are never mutated or deleted.

