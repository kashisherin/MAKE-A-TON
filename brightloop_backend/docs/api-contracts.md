# Brightloop Subscription Control Tower – API Contracts

All endpoints are rooted under the common prefix: `/api/v1/`.

## Global API Conventions
- **Authentication**: Bearer JWT token passed in header: `Authorization: Bearer <access_token>`.
- **Content-Type**: `application/json`
- **Response Formats**:
  - Success: `200 OK`, `201 Created`, or `204 No Content`.
  - List Endpoints: Standard DRF pagination object `{ "count": <int>, "next": <url|null>, "previous": <url|null>, "results": [...] }`.
  - Error Responses: Uniform error payload format:
    ```json
    {
      "success": false,
      "errors": {
        "detail": "Error explanation or field-specific validation errors"
      }
    }
    ```
- **Monetary Representations**: All currency amounts (prices, totals, adjustments) are returned as Decimal strings (e.g., `"2000.00"`).

---

## 1. Authentication & User Management

### `POST /api/v1/auth/register/`
- **Access**: Public
- **Role Assigned**: Automatically sets `CUSTOMER`. Any role provided in payload is ignored.
- **Request Body**:
  ```json
  {
    "email": "customer@acme.com",
    "password": "StrongPassword!2026",
    "first_name": "Asha",
    "last_name": "Sharma",
    "company_name": "Acme Software"
  }
  ```
- **Password Rules**:
  - Must be MORE THAN 8 characters long (> 8 chars, so >= 9 characters).
  - Must contain at least one uppercase letter (`[A-Z]`).
  - Must contain at least one lowercase letter (`[a-z]`).
  - Must contain at least one special character (`[^A-Za-z0-9]`).
- **Response (`201 Created`)**:
  ```json
  {
    "id": 1,
    "email": "customer@acme.com",
    "role": "CUSTOMER",
    "message": "Registration successful"
  }
  ```

### `POST /api/v1/auth/login/`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "customer@acme.com",
    "password": "StrongPassword!2026"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "email": "customer@acme.com",
      "role": "CUSTOMER",
      "first_name": "Asha",
      "last_name": "Sharma"
    }
  }
  ```

### `POST /api/v1/auth/token/refresh/`
- **Access**: Public (requires valid refresh token)

### `POST /api/v1/auth/password-reset/`
- **Access**: Public

### `POST /api/v1/auth/password-reset/confirm/`
- **Access**: Public

### `GET /api/v1/auth/users/` & `POST /api/v1/auth/users/`
- **Access**: `ADMIN` only
- **Purpose**: Provision internal `STAFF` or secondary `ADMIN` accounts.

### `POST /api/v1/auth/users/{id}/deactivate/`
- **Access**: `ADMIN` only (cannot deactivate self)

---

## 2. Customer Management

### `GET /api/v1/customers/`
- **Access**: Authenticated
  - `ADMIN`: Returns all customer profiles.
  - `STAFF`: Returns assigned customers and unassigned operational customers.
  - `CUSTOMER`: Returns only their own linked profile (`count: 1`).
- **Query Parameters**: `search`, `is_active`, `city`, `state`, `ordering`, `page`

### `POST /api/v1/customers/`
- **Access**: `ADMIN`, `STAFF`
- **Email Uniqueness**: Customer email is unique across all customer profiles and must match the linked user account email.

### `GET /api/v1/customers/{id}/`
- **Access**: `ADMIN`, `STAFF` (assigned/unassigned), or `CUSTOMER` owner. Any attempt to access unauthorized customer records returns `404 Not Found`.

### `PATCH /api/v1/customers/{id}/`
- **Access**: `ADMIN`, `STAFF` (assigned/unassigned), or `CUSTOMER` owner. Customers cannot change `user`, `assigned_staff`, or `is_active`.

### `POST /api/v1/customers/{id}/deactivate/`
- **Access**: `ADMIN`, `STAFF`

---

## 3. Product & Variant Management

### `GET /api/v1/products/`
- **Access**: Authenticated (`ADMIN`, `STAFF`, `CUSTOMER`)

### `POST /api/v1/products/`
- **Access**: `ADMIN`, `STAFF`

### `GET /api/v1/products/{id}/variants/`
- **Access**: Authenticated

### `POST /api/v1/products/{id}/variants/`
- **Access**: `ADMIN`, `STAFF`
- **Special Business Rule**: If `brand` is `"Odoo"` (case-insensitive), `price_adjustment` MUST be exactly `"560.00"`. Any other adjustment returns `400 Bad Request`.
- **Final Price Calculation**: Done strictly server-side (`final_price = sales_price + price_adjustment`).

---

## 4. Subscription Plan Management

### `GET /api/v1/plans/`
- **Access**: Authenticated (`ADMIN`, `STAFF`, `CUSTOMER`)

### `POST /api/v1/plans/`
- **Access**: `ADMIN` only (`STAFF` and `CUSTOMER` receive `403 Forbidden`)
- **Supported Frequencies**: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`.

---

## 5. Quotation Management

### `GET /api/v1/quotations/`
- **Access**: Authenticated (`ADMIN` sees all; `STAFF` sees assigned/unassigned customers; `CUSTOMER` sees only their own).

### `POST /api/v1/quotations/`
- **Access**: `ADMIN`, `STAFF` (for assigned/unassigned customers)
- **Validity Calculation**: `valid_until` is optional. If omitted:
  - Calculated automatically from template `validity_days` if `template` is selected.
  - Or defaults to 15 days from today if no template is selected.
- **Request Body Example**:
  ```json
  {
    "customer": 1,
    "template": 1,
    "notes": "Standard proposal",
    "lines": [
      { "plan": 1, "quantity": 2 },
      { "product": 1, "variant": 1, "quantity": 1 }
    ]
  }
  ```

### `POST /api/v1/quotations/{id}/accept/`
- **Access**: `ADMIN`, `STAFF` (assigned/unassigned)
- **Validation**: Checks `valid_until`. If expired, marks `EXPIRED` and rejects.

### `POST /api/v1/quotations/{id}/convert-to-subscription/`
- **Access**: `ADMIN`, `STAFF` (assigned/unassigned)
- **Transactional Guarantees & Validations**:
  - `transaction.atomic()` with `select_for_update()`.
  - Verifies quotation is `ACCEPTED` and not previously converted.
  - **Plan Rule**: Verifies quotation specifies exactly one plan (rejects if multiple distinct plans).
  - **Product/Variant Validation**: Verifies all variants match their parent products and are active.
  - Enforces plan minimum quantity.
  - Prevents race conditions and duplicate conversions.

### `GET /api/v1/quotations/templates/` & `POST /api/v1/quotations/templates/`
- **Access**: `ADMIN`, `STAFF`
- **Supports Nested Lines**: Templates can be created or updated with `lines: [...]`.

### Template Lines Management (`/api/v1/quotations/template-lines/`)
- `GET /api/v1/quotations/template-lines/?template={id}`: List lines for a template.
- `POST /api/v1/quotations/template-lines/`: Add a line to a template.
- `GET /api/v1/quotations/template-lines/{id}/`: Retrieve line details.
- `PATCH /api/v1/quotations/template-lines/{id}/`: Update quantity, product, variant, or plan.
- `DELETE /api/v1/quotations/template-lines/{id}/`: Remove line from template.

---

## 6. Subscription Management

### `GET /api/v1/subscriptions/`
- **Access**: Authenticated (`ADMIN` sees all; `STAFF` sees assigned/unassigned; `CUSTOMER` sees only their own).

### `POST /api/v1/subscriptions/`
- **Access**: `ADMIN`, `STAFF` (for assigned/unassigned customers).

### `POST /api/v1/subscriptions/{id}/confirm/`
- **Allowed From**: `DRAFT`, `QUOTATION` -> `CONFIRMED`.

### `POST /api/v1/subscriptions/{id}/activate/`
- **Allowed From**: `CONFIRMED` -> `ACTIVE`.

### `POST /api/v1/subscriptions/{id}/pause/`
- **Allowed From**: `ACTIVE` -> `PAUSED` (Requires `plan.pause_allowed == true`).

### `POST /api/v1/subscriptions/{id}/resume/`
- **Allowed From**: `PAUSED` -> `ACTIVE` (Extends expiry by paused duration).

### `POST /api/v1/subscriptions/{id}/renew/`
- **Allowed From**: `ACTIVE` (Requires `plan.renewal_allowed == true`). Requires client `idempotency_key` to prevent duplicate extensions.

### `POST /api/v1/subscriptions/{id}/close/`
- **Early Closure Rule**: Both `ACTIVE` and `PAUSED` subscriptions require `plan.early_closure_allowed == true` if closed before `expiry_date`.

### `GET /api/v1/subscriptions/{id}/history/`
- **Access**: Authenticated (`ADMIN`/`STAFF` or object owner).

---

## 7. Audit Log

### `GET /api/v1/audit/`
- **Access**: `ADMIN` only (`STAFF` and `CUSTOMER` receive `403 Forbidden`).
- **Model-Level Immutability**: `AuditLog` records cannot be updated or deleted through the API, Django admin, or direct ORM updates/deletions.
