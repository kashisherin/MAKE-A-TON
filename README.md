# MAKE-A-TON — Brightloop Subscription Control Tower

Brightloop is an enterprise-grade subscription management control tower and simulation platform.

## Repository Modules

- **`brightloop_backend/`**: Core Django REST Framework backend (Lead: Harini)
  - Custom User model & JWT authentication with RBAC (`ADMIN`, `STAFF`, `CUSTOMER`)
  - Customer profiles with strict email uniqueness and staff ownership isolation
  - Product & Variant pricing engine (including Odoo ₹560 rule)
  - Subscription Plans (daily, weekly, monthly, yearly frequencies)
  - Quotation templates, line management & atomic quotation-to-subscription conversion
  - Robust subscription lifecycle state machine (`DRAFT`, `CONFIRMED`, `ACTIVE`, `PAUSED`, `CLOSED`)
  - Model-level immutable server-side audit trail
  - 59 automated test cases covering all business and security rules
  - Complete OpenAPI 3.0 documentation (`docs/openapi-schema.yml`)

- **`Brightloop_GitHub_Upload/`**: Digital Twin simulation engine & Streamlit interactive dashboard
