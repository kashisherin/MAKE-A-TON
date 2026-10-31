# MAKE-A-TON — Brightloop & KASHI Subscription Control Tower

Brightloop & KASHI constitute an enterprise-grade subscription management control tower, simulation platform, and financial intelligence engine.

---

## Repository Modules

### 1. `brightloop_backend/`
Core Django REST Framework backend:
- Custom User model & JWT authentication with RBAC (`ADMIN`, `STAFF`, `CUSTOMER`)
- Customer profiles with strict email uniqueness and staff ownership isolation
- Product & Variant pricing engine (including Odoo ₹560 rule)
- Subscription Plans (daily, weekly, monthly, yearly frequencies)
- Quotation templates, line management & atomic quotation-to-subscription conversion
- Robust subscription lifecycle state machine (`DRAFT`, `CONFIRMED`, `ACTIVE`, `PAUSED`, `CLOSED`)
- Model-level immutable server-side audit trail
- 59 automated test cases covering all business and security rules
- Complete OpenAPI 3.0 documentation (`docs/openapi-schema.yml`)

### 2. `Brightloop_GitHub_Upload/`
Digital Twin simulation engine & Streamlit interactive dashboard:
- Simulation of subscription states, churn, and lifecycle events
- Interactive multi-scenario parameter controls

### 3. `KASHI_Billing_Subscription_Intelligence/`
Production-grade financial backbone and subscription intelligence subsystem (FastAPI + SQLAlchemy 2.x):
- **Invoice Lifecycle & Documents:** Draft -> Issued -> Partially Paid -> Paid -> Void state machine with ReportLab PDF tax invoices and duplicate billing prevention
- **Taxation Engine:** Configurable jurisdiction rules supporting Indian GST (Intra-state 9% CGST + 9% SGST vs Inter-state 18% IGST), VAT, exemptions, and tax-inclusive/exclusive pricing
- **Discount & Coupon Engine:** Fixed and percentage discounts with minimum spend, caps, and stacking protection
- **Payments & Refunds:** Multi-invoice allocations, idempotency keys, non-destructive refund event records, and provider reconciliation
- **Automated Recurring Billing:** Schedulers, proration calculations, execution runs, and overdue aging reports (Current, 1-30, 31-60, 61-90, 90+ days)
- **FLEXI-BILL Flexible Consumption:**
  - Immutable prepaid wallet ledger with concurrency controls (`with_for_update`) and overdraft prevention
  - Metered usage rating (flat, tiered, volume) with automated wallet deductions
  - Digital entitlements & micro-subscriptions (temporary access grants and background expiry worker)
  - Smart Consumption Optimizer comparing Pay-As-You-Go, Prepaid Packs, Monthly, and Annual tiers
- **PULSE Subscription Intelligence:**
  - Utilization analytics (purchased vs assigned vs active vs actually used seats)
  - Evidence-backed savings detection for idle licenses and duplicate subscriptions
  - Proactive renewal and right-sizing recommendations
  - Explainable Revenue Health Score (0–100) with factor weighting and explicit missing signal reporting
- **Financial Audit & Analytics:** Sanitized audit trails, revenue metrics (invoiced, collected, outstanding, MRR/ARR), and multi-tenant isolation
- **Automated Tests & Verification:** 33 passing automated test cases and interactive demonstration UI (`/dashboard`)
