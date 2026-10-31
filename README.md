# MAKE-A-TON — Brightloop & KASHI Subscription Control Tower

Brightloop & KASHI constitute an enterprise-grade subscription management control tower, simulation platform, and financial intelligence engine.

---

## 🏛 Integrated Architecture Overview

```text
MAKE-A-TON/
├── brightloop_backend/                    # Django 5.x REST Framework Backend v2 (Port 8000)
├── brightloop-frontend/                   # Vite + React + Tailwind CSS Dashboard (Port 5173)
├── Brightloop_Subscription_Control_Tower/ # Streamlit Digital Twin & 300-Client Database (Port 8501)
├── KASHI_Billing_Subscription_Intelligence/ # FastAPI Financial Engine, GST, Wallets & PULSE (Port 8001)
├── portal.html                            # Standalone Quick-Access Multi-Role HTML Demo
├── SETUP_AND_HANDOFF.md                   # Operational Setup & Architecture Guide
└── scripts/                               # Utility & verification scripts
```

---

## 🚀 Quick Start Guide

### 1. Control Tower Dashboard & 300-Client Digital Twin
```powershell
cd Brightloop_Subscription_Control_Tower
streamlit run app.py
# Running on http://localhost:8501
```
- **Preloaded SQLite Database:** `outputs/brightloop_300_clients.sqlite3`
  - 300 Verified customers & 302 user accounts
  - Products, plans, and variants
  - 300 Quotations and 300 active/paused/closed subscriptions
  - 276 Invoices and 255 verified payments
  - Total collected revenue: **₹21,52,583.49**
  - Total invoiced: **₹25,07,968.69**
- **Digital Twin Simulation:** Run what-if simulations on price adjustments and renewal churn.
- **Ollama AI Agent:** Supports local `llama3.2` for natural language querying.

---

### 2. Django REST Framework Backend v2
```powershell
cd brightloop_backend
python -m pip install -r requirements.txt
python manage.py migrate
python seed_from_control_tower.py    # Seeds 300 clients, admin and staff into Django DB
python manage.py runserver 8000
# Running on http://localhost:8000/api
```
- **Preconfigured Credentials:**
  - **Admin:** `admin@brightloop.com` / `AdminPass123!`
  - **Staff:** `staff@brightloop.com` / `StaffPass123!`
  - **Customer:** `customer1@...` / `CustomerPass123!`
- **Automated Tests:** `python manage.py test` (59 tests passing in 0.36s)

---

### 3. Vite + React Frontend
```powershell
cd brightloop-frontend
npm install
npm run dev
# Running on http://localhost:5173
```
- Connects to Django backend API at `http://localhost:8000/api` with fallback demo mode enabled.

---

### 4. KASHI Billing & Subscription Intelligence Engine
```powershell
cd KASHI_Billing_Subscription_Intelligence
$env:PYTHONPATH="."
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
# Dashboard: http://127.0.0.1:8001/dashboard
# Swagger Docs: http://127.0.0.1:8001/docs
```
- **Invoice Lifecycle:** Draft -> Issued -> Partially Paid -> Paid -> Void state machine with ReportLab PDF invoices.
- **Indian GST Taxation:** Intra-state 9% CGST + 9% SGST vs Inter-state 18% IGST.
- **FLEXI-BILL Wallets:** Immutable ledger transactions, concurrency protection, metered usage deductions, and digital entitlements.
- **PULSE Intelligence:** License waste detection, seat right-sizing, explainable 0–100 Revenue Health Score.
- **Automated Tests:** `python -m pytest KASHI_Billing_Subscription_Intelligence/tests` (33 tests passing in 0.62s)

---

### 5. Standalone Quick Portal
Open `portal.html` directly in any web browser for an instant interactive demonstration of Admin, Staff, and Customer subscription views.
