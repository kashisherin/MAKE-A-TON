# Brightloop Subscription Control Tower – Team Integration Guide

This guide establishes the shared contract between Harini's Core Backend and the other members of the Brightloop development team:
- **Adithyan**: Frontend / UI Lead (React application)
- **Kashi**: Billing & Financial Intelligence Lead (Invoicing, Taxes, Discounts, Payments, FLEXI-BILL, PULSE)
- **Member 4**: Digital Twin Simulation Lead (What-if financial simulation engine)

---

## 1. Integration with Adithyan (Frontend Lead)

### Base URLs & Authentication
- Development Server API Root: `http://127.0.0.1:8000/api/v1/`
- Interactive OpenAPI Swagger Explorer: `http://127.0.0.1:8000/api/docs/`
- OpenAPI Schema: `http://127.0.0.1:8000/api/schema/`

### Authentication & Token Lifecycle
1. **Registration**: `POST /api/v1/auth/register/`
   - Payload: `{ "email": "...", "password": "...", "first_name": "...", "last_name": "...", "company_name": "..." }`
   - Passwords must be longer than 8 characters, with 1 uppercase, 1 lowercase, and 1 special character.
   - Automatically registers the user under the `CUSTOMER` role and auto-generates their customer profile.
2. **Login**: `POST /api/v1/auth/login/`
   - Returns `{ "access": "<jwt_token>", "refresh": "<refresh_token>", "user": { "id": 1, "email": "...", "role": "..." } }`.
   - Store the access token in memory or secure storage.
   - Send on every subsequent request header: `Authorization: Bearer <access_token>`.
3. **Token Refresh**: `POST /api/v1/auth/token/refresh/`
   - When an access token expires (30-minute lifespan), exchange the refresh token for a new access token.

### Role-Based Access in the UI
The backend strictly determines permissions based on the authenticated database user token. **Never attempt to pass or trust a role sent from the frontend.**
- `ADMIN`: Show full administration navigation (Staff management, Products, Plans, Customers, Subscriptions, Audit Log).
- `STAFF`: Show operational navigation (Customers, Quotations, Subscriptions). Staff queries are strictly scoped to assigned and unassigned operational customers.
- `CUSTOMER`: Show Customer Self-Service Portal (My Subscriptions, My Quotations, My Profile). Filter logic is automatically enforced on the backend—calling `/api/v1/subscriptions/` returns only the customer's own subscriptions.

### Quotation Template Lines
- Admins and Staff can create templates with nested lines or manage lines individually via `/api/v1/quotations/template-lines/`.
- Quotation `valid_until` is optional on quote creation and calculates automatically from template `validity_days`.

### Subscription Lifecycle Actions
Do not attempt to update subscription states via generic `PATCH` requests. The backend guards states using dedicated transition action endpoints:
- Confirm: `POST /api/v1/subscriptions/{id}/confirm/`
- Activate: `POST /api/v1/subscriptions/{id}/activate/`
- Pause: `POST /api/v1/subscriptions/{id}/pause/`
- Resume: `POST /api/v1/subscriptions/{id}/resume/`
- Renew: `POST /api/v1/subscriptions/{id}/renew/` (Send `{ "idempotency_key": "unique_string" }`)
- Close: `POST /api/v1/subscriptions/{id}/close/` (Send optional `{ "reason": "text" }`)

### Standard Error Format
When a validation or rule check fails, DRF returns HTTP `400 Bad Request`:
```json
{
  "success": false,
  "errors": {
    "field_name": ["Detailed error message describing why validation failed."]
  }
}
```

---

## 2. Integration with Kashi (Billing Lead)

### Canonical Shared Model Primary Keys
Kashi's invoicing, payment, and discount modules can consume the following stable primary keys directly without copying or duplicating data:
1. `Customer.id` (BigInteger PK, unique email)
2. `Subscription.id` (BigInteger PK) and `Subscription.number` (Unique string e.g. `BL-20261031120000-A1B2C3`)
3. `SubscriptionLine.id` (BigInteger PK)
4. `Product.id` and `ProductVariant.id` (BigInteger PKs)
5. `Plan.id` (BigInteger PK)

### Data Types & Financial Standards
- All currency values (`sales_price`, `cost_price`, `price_adjustment`, `unit_price`, `line_total`, `price`) are strictly backed by Python `Decimal` / PostgreSQL `NUMERIC(12, 2)` or `NUMERIC(14, 2)`.
- Never cast monetary amounts to floating-point numbers in Python or JavaScript.

### Billing Period Triggering
To generate recurring invoices without duplicate or skipped billing:
- Read active subscriptions: `Subscription.objects.filter(status='ACTIVE')`.
- Subscription fields:
  - `start_date`: Initial contract commencement.
  - `expiry_date`: Current period cutoff date.
  - `next_renewal_date`: Scheduled date for next recurring bill generation.
  - `billing_frequency`: Frequency string (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`).
- Subscription lines:
  - `line.product_id`: Covered product.
  - `line.variant_id`: Optional variant.
  - `line.quantity`: Number of seats or units.
  - `line.unit_price`: Authoritative unit price.
  - `line.line_total`: Server-calculated line total.
  - `line.tax_reference`: Designated tax category code (e.g. `GST-18`, `VAT-STD`) for Kashi's tax calculation service.

### Status Coordination
- Only subscriptions in `ACTIVE` state are eligible for regular recurring invoice creation.
- Subscriptions in `PAUSED` state must not have renewal invoices generated until they are resumed.
- Subscriptions in `CLOSED` state must never be billed.

---

## 3. Integration with Member 4 (Digital Twin AI Lead)

### Read-Only Access Contract
The Digital Twin Simulator evaluates "what-if" business scenarios (e.g., plan price adjustments, expiring discount impacts, churn risk analysis).
To guarantee data integrity:
1. **No Direct Simulation Writes**: The simulation engine must NEVER write simulation drafts or temporary test numbers to live `subscriptions_subscription` or `products_product` database tables.
2. **Approved Data Sources**:
   - Query live models via ORM or GET API:
     - `Customer.objects.filter(is_active=True)`
     - `Product.objects.filter(is_active=True).prefetch_related('variants')`
     - `Plan.objects.filter(is_active=True)`
     - `Subscription.objects.filter(status='ACTIVE').select_related('customer', 'plan')`
   - Or consume the read-only endpoint `/api/v1/subscriptions/?status=ACTIVE`.
3. **Execution Options for Simulations**:
   - **Option A (In-memory clone)**: Extract records into Python dataclasses or dictionaries, calculate financial impacts in pure Python, and return projected figures.
   - **Option B (Transaction Rollback)**: Open a `transaction.atomic()`, execute calculations, and guarantee that the transaction is rolled back before returning the HTTP response.
4. **Approval & Audit Event**:
   - When an Administrator clicks "Approve Simulation Scenario", the change is committed via standard backend services, and a corresponding audit event is written to `audit.AuditLog` (e.g. `action='DIGITAL_TWIN_SCENARIO_APPROVED'`).
