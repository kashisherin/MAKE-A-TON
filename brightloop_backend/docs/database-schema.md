# Brightloop Subscription Control Tower – Database Schema

This normalized relational database schema is designed for PostgreSQL with `psycopg[binary]`. All monetary values use `DecimalField(max_digits=12/14, decimal_places=2)`. Never use floating-point types for financial columns.

---

## 1. App: `accounts`

### Model: `User` (Custom User Model)
Inherits from `AbstractUser`. Uses email for authentication (`USERNAME_FIELD = 'email'`). Plaintext passwords are never stored; hashing uses Django PBKDF2/SHA256 (or MD5 in test mode).

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical user identifier |
| `email` | EmailField | Unique, Indexed | User login email |
| `role` | CharField(12) | Choices: `ADMIN`, `STAFF`, `CUSTOMER`, Default: `CUSTOMER` | System access tier |
| `first_name` | CharField(150) | Blank allowed | User given name |
| `last_name` | CharField(150) | Blank allowed | User family name |
| `is_active` | BooleanField | Default: True | Account active status |
| `is_staff` | BooleanField | Default: False | True for Admin |
| `is_superuser`| BooleanField | Default: False | True for Admin |
| `date_joined` | DateTimeField | auto_now_add=True | Registration timestamp |

---

## 2. App: `customers`

### Model: `Customer`
Commercial customer entity. Linked to `accounts.User` for customer self-service.

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical customer identifier |
| `user` | OneToOneField(User) | Null=True, Blank=True, on_delete=CASCADE, related_name='customer_profile' | Linked customer user login |
| `assigned_staff` | ForeignKey(User) | Null=True, Blank=True, on_delete=SET_NULL, limit_choices_to={'role':'STAFF'} | Staff account manager |
| `company_name` | CharField(200) | Blank allowed, Indexed | Company / organization name |
| `contact_person`| CharField(160) | Required | Primary contact name |
| `email` | EmailField | Unique, Indexed | Primary business email (must match linked user) |
| `phone_number` | CharField(30) | Blank allowed | Contact telephone |
| `address` | TextField | Blank allowed | Street address |
| `city` | CharField(100) | Blank allowed | City |
| `state` | CharField(100) | Blank allowed | State / province |
| `postal_code` | CharField(20) | Blank allowed | ZIP / Postal code |
| `is_active` | BooleanField | Default: True, Indexed | Soft deactivation flag |
| `created_at` | DateTimeField | auto_now_add=True | Record creation timestamp |
| `updated_at` | DateTimeField | auto_now=True | Last update timestamp |

---

## 3. App: `products`

### Model: `Product`
Base commercial product / software module.

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical product identifier |
| `name` | CharField(180) | Indexed | Product name |
| `product_type` | CharField(100) | Indexed | Category / Type (e.g. `SOFTWARE`, `SERVICE`) |
| `sales_price` | DecimalField(12,2) | Check >= 0.00 | Base sales price |
| `cost_price` | DecimalField(12,2) | Check >= 0.00, Default: 0.00 | Internal product cost |
| `description` | TextField | Blank allowed | Notes and description |
| `is_active` | BooleanField | Default: True, Indexed | Active availability flag |
| `created_at` | DateTimeField | auto_now_add=True | Creation timestamp |
| `updated_at` | DateTimeField | auto_now=True | Last update timestamp |

### Model: `ProductVariant`
Variants modifying a base product (e.g. brand, tier, edition).

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical variant identifier |
| `product` | ForeignKey(Product) | on_delete=PROTECT, related_name='variants' | Parent product |
| `variant_name` | CharField(120) | Required | Variant designation (e.g. `Odoo Edition`) |
| `brand` | CharField(100) | Blank allowed, Indexed | Brand attribute |
| `price_adjustment`| DecimalField(12,2)| Default: 0.00, Check >= 0.00 | Incremental price addition |
| `is_active` | BooleanField | Default: True, Indexed | Active flag |

**Business Rule**: When `brand.lower() == 'odoo'`, `price_adjustment` must equal exactly `560.00`.  
**Computed Property**: `final_price = product.sales_price + price_adjustment`.

---

## 4. App: `plans`

### Model: `Plan`
Defines recurring billing cadence and subscription lifecycle policies.

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical plan identifier |
| `name` | CharField(160) | Required | Plan name |
| `description` | TextField | Blank allowed | Plan details |
| `billing_frequency`| CharField(10) | Choices: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, Indexed | Billing cadence |
| `price` | DecimalField(12,2) | Check >= 0.00 | Recurring fee per period |
| `minimum_quantity` | PositiveIntegerField| Default: 1, Check >= 1 | Minimum seat / unit threshold |
| `available_from` | DateField | Null=True, Blank=True | Window open date |
| `available_until`| DateField | Null=True, Blank=True | Window close date |
| `auto_close_enabled`| BooleanField | Default: True | Automatically close upon expiry |
| `early_closure_allowed`| BooleanField | Default: False | Allow customer/staff early termination |
| `pause_allowed` | BooleanField | Default: False | Allow customer to pause plan |
| `renewal_allowed`| BooleanField | Default: True | Allow extension at expiry |
| `is_active` | BooleanField | Default: True, Indexed | Active availability flag |
| `created_at` | DateTimeField | auto_now_add=True | Creation timestamp |
| `updated_at` | DateTimeField | auto_now=True | Last update timestamp |

---

## 5. App: `quotations`

### Model: `QuotationTemplate`
Reusable proposal templates configured with validity days.

| Field | Type | Description |
|---|---|---|
| `id` | BigAutoField | Primary key |
| `name` | CharField(160) | Template title |
| `description` | TextField | Internal notes |
| `validity_days` | PositiveIntegerField | Default valid lifespan (e.g. 15 or 30 days) |
| `is_active` | BooleanField | Available for quote generation |
| `created_at` | DateTimeField | Creation timestamp |

### Model: `QuotationTemplateLine`
Lines associated with a `QuotationTemplate`. References Product, Variant, or Plan with default quantity.

### Model: `Quotation`
Commercial proposal presented to a customer.

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical quote identifier |
| `number` | CharField(36) | Unique, Indexed | Unique code e.g. `QT-YYYYMMDDHHMMSS-XXXXXX` |
| `customer` | ForeignKey(Customer) | on_delete=PROTECT, related_name='quotations' | Target customer |
| `template` | ForeignKey(QuotationTemplate)| Null=True, Blank=True, on_delete=SET_NULL | Source template |
| `created_by` | ForeignKey(User) | on_delete=PROTECT | Creating staff / admin user |
| `created_at` | DateTimeField | auto_now_add=True | Creation timestamp |
| `valid_until` | DateField | Indexed | Expiration date |
| `status` | CharField(12) | Choices: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED` | Quote lifecycle state |
| `notes` | TextField | Blank allowed | Customer notes / terms |
| `subtotal` | DecimalField(14,2) | Default: 0.00 | Sum of line totals |
| `discount_reference`| CharField(120) | Blank allowed | Promotional code reference |
| `total` | DecimalField(14,2) | Default: 0.00 | Net payable total |
| `converted` | BooleanField | Default: False | True once converted to subscription |

### Model: `QuotationLine`
Line items detailing products, variants, or plans, with quantities, parent-product integrity validation, and server-computed totals.

---

## 6. App: `subscriptions`

### Model: `Subscription`
The central operational model representing a recurring contract.

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical subscription identifier |
| `number` | CharField(36) | Unique, Indexed | Unique reference code e.g. `BL-YYYYMMDDHHMMSS-XXXXXX` |
| `customer` | ForeignKey(Customer) | on_delete=PROTECT, related_name='subscriptions' | Contract holder |
| `plan` | ForeignKey(Plan) | on_delete=PROTECT, related_name='subscriptions' | Underlying billing plan |
| `quotation` | OneToOneField(Quotation)| Null=True, Blank=True, on_delete=SET_NULL | Originating quotation |
| `start_date` | DateField | Required | Contract start date |
| `expiry_date` | DateField | Required, Indexed | Current period expiry date |
| `billing_frequency`| CharField(10) | Choices: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` | Renewal frequency |
| `payment_terms`| CharField(120) | Blank allowed | Commercial terms (e.g. `Net 30`) |
| `quantity` | PositiveIntegerField | Default: 1 | Number of active units / seats |
| `status` | CharField(12) | Choices: `DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `PAUSED`, `CLOSED`, Indexed | Lifecycle state |
| `created_by` | ForeignKey(User) | on_delete=PROTECT | Provisioning actor |
| `created_at` | DateTimeField | auto_now_add=True | Creation timestamp |
| `updated_at` | DateTimeField | auto_now=True | Last update timestamp |
| `next_renewal_date`| DateField | Null=True, Blank=True | Scheduled renewal timestamp |
| `pause_date` | DateField | Null=True, Blank=True | Date paused (if in PAUSED state) |
| `closure_date` | DateField | Null=True, Blank=True | Date closed (if in CLOSED state) |
| `closure_reason`| TextField | Blank allowed | Audit reason for closure |
| `activated_at` | DateField | Null=True, Blank=True | Date first activated |

### Model: `SubscriptionLine`
Product line items covered by the subscription contract.

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Canonical line identifier |
| `subscription` | ForeignKey(Subscription)| on_delete=CASCADE, related_name='lines' | Parent subscription |
| `product` | ForeignKey(Product) | Null=True, Blank=True, on_delete=PROTECT | Product entity |
| `variant` | ForeignKey(ProductVariant)| Null=True, Blank=True, on_delete=PROTECT | Variant entity |
| `quantity` | PositiveIntegerField | Default: 1 | Quantity of this product |
| `unit_price` | DecimalField(12,2) | Required | Unit price snapshot |
| `line_total` | DecimalField(14,2) | Required | `quantity * unit_price` |
| `tax_reference`| CharField(100) | Blank allowed | Tax code consumed by Kashi's billing app |

### Model: `SubscriptionHistory`
Append-only log of every status transition.

### Model: `RenewalRecord`
Immutable record of each subscription extension with duplicate protection (`idempotency_key`).

---

## 7. App: `audit`

### Model: `AuditLog`
Model-level immutable audit trail recording all critical mutations across all apps. Updates and deletions are blocked by custom model managers and overridden `save()` / `delete()` methods.

| Field | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | BigAutoField | Primary Key | Audit entry identifier |
| `user` | ForeignKey(User) | Null=True, Blank=True, on_delete=SET_NULL | Acting user account |
| `user_role` | CharField(20) | Blank allowed, Indexed | User role at action time |
| `action` | CharField(80) | Indexed | Action name e.g. `SUBSCRIPTION_CREATED` |
| `entity_type` | CharField(80) | Indexed | Class name e.g. `Subscription` |
| `entity_id` | CharField(80) | Indexed | Target primary key as string |
| `timestamp` | DateTimeField | auto_now_add=True, Indexed | Exact UTC event time |
| `before_values`| JSONField | Default: dict | Snapshot before change |
| `after_values` | JSONField | Default: dict | Snapshot after change |
| `metadata` | JSONField | Default: dict | Contextual details (IP, reason, key) |
