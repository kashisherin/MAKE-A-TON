# BRIGHTLOOP – Subscription Control Tower
## Core Backend Modules (Lead: Harini)

Brightloop is a mission-critical subscription management and control tower platform. This backend provides the operational foundation: user authentication and role management, customer lifecycle, product and variant pricing engines, flexible billing plans, quotation-to-subscription pipeline, subscription state machine, and an immutable audit trail.

---

## 1. Architecture & Technology Stack

- **Language**: Python 3.11+ / 3.12
- **Framework**: Django 5.1+ & Django REST Framework 3.15+
- **Database**: PostgreSQL (with psycopg 3) / SQLite fallback for isolated test execution
- **Authentication**: Django Auth + Simple JWT (Stateless access & refresh tokens)
- **API Documentation**: drf-spectacular (OpenAPI 3.0 & Swagger UI)
- **Financial Arithmetic**: `DecimalField` (strictly zero floating-point arithmetic for monetary calculations)

### Application Layout
```
brightloop_backend/
├── config/              # Shared settings, root URLs, exceptions, WSGI
├── accounts/            # Custom User model, JWT auth, RBAC permissions, password reset
├── customers/           # Customer management, staff isolation filters, unique email
├── products/            # Product catalog, Odoo variant rule (+₹560), server price calc
├── plans/               # Subscription plans, billing frequencies, policy flags
├── quotations/          # Templates, template-line management, atomic quotation-to-subscription
├── subscriptions/       # Subscription lifecycle state machine, pause/resume, renewal, early-closure
├── audit/               # Model-level immutable server-side audit logging
├── docs/                # API contracts, database schema, team integration guides
├── manage.py
├── requirements.txt
├── .env.example
└── .env
```

---

## 2. Setup & Installation

### A. Environment Preparation
```bash
# 1. Navigate to the backend directory
cd brightloop_backend

# 2. Create and activate a Python virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

### B. Environment Configuration
Copy `.env.example` to `.env`:
```bash
# Windows:
copy .env.example .env
# macOS/Linux:
cp .env.example .env
```

Configure database credentials in `.env`:
```ini
DJANGO_SECRET_KEY=your-secure-random-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# For PostgreSQL:
DB_ENGINE=postgresql
DB_NAME=brightloop
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=5432
```

---

## 3. Database Migrations & Initial Setup

```bash
# Apply migrations to your PostgreSQL database
python manage.py migrate

# Create the initial Superuser (ADMIN)
python manage.py createsuperuser
```

---

## 4. Running the Development Server

```bash
python manage.py runserver
```
The server will start at `http://127.0.0.1:8000/`.

- **API Base**: `http://127.0.0.1:8000/api/v1/`
- **Interactive Swagger UI**: `http://127.0.0.1:8000/api/docs/`
- **OpenAPI 3.0 Schema**: `http://127.0.0.1:8000/api/schema/`
- **Django Admin**: `http://127.0.0.1:8000/admin/`

---

## 5. Running Automated Tests

Run the full automated test suite covering authentication, permissions, customer uniqueness, staff isolation, products, plans, quotation template lines, quotation validity, quotation-to-subscription conversion, subscription lifecycle, and model-level audit immutability:

```bash
python manage.py test accounts customers products plans quotations subscriptions audit
```

The test suite executes 59 test cases in under one second.

---

## 6. Background Scheduled Expiry Command

To automatically close active subscriptions whose expiry date has passed (when `auto_close_enabled=True` on their plan), run:

```bash
python manage.py expire_subscriptions
```
This command should be scheduled via cron (Linux/macOS) or Windows Task Scheduler to run daily at midnight.

---

## 7. Key Business Rules & Security Guarantees

1. **Role Boundary & Data Isolation**:
   - `ADMIN`: Complete system access, staff provisioning, plan management, audit viewing.
   - `STAFF`: Scoped strictly to assigned and unassigned operational customers, quotations, and subscriptions. Cannot view or alter other staff members' assigned records.
   - `CUSTOMER`: Strict data isolation. Can only access their own profile, quotations, and subscriptions. Modifying URL IDs returns `404 Not Found`.
2. **Customer Email Uniqueness**:
   - Customer profile email has a database-level uniqueness constraint and is validated to match the linked user account email.
3. **Password Security**:
   - Enforces length > 8 characters, uppercase, lowercase, and special characters. Plaintext passwords are never stored.
4. **Odoo Variant Pricing**:
   - The Odoo brand variant is validated on the backend to add exactly ₹560.00 to base product price.
5. **Quotation Validity & Conversion**:
   - Quotation `valid_until` calculates dynamically from template validity if omitted.
   - Quotation conversion enforces single-plan linkage, validates product/variant combinations, executes within `transaction.atomic()`, and prevents duplicate conversion.
6. **Subscription State Machine**:
   - Strictly guarded transitions: `DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> PAUSED -> CLOSED`.
   - Early closure policy is strictly enforced on both `ACTIVE` and `PAUSED` subscriptions.
   - Renewals require an `idempotency_key` to prevent double-billing.
7. **Model-Level Audit Immutability**:
   - AuditLog records cannot be updated or deleted through the API, admin, or bulk ORM operations.
