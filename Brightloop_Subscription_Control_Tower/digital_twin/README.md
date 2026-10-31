# Brightloop Digital Twin

This module models the entities and billing rules described in the uploaded Subscription Management System brief.

## Covered data

- Users, roles, customers, and customer portal ownership
- Products, cost/sales prices, notes, and variants
- Plans, billing frequency, minimum quantity, availability, pause/renew/close rules
- Taxes and discount rules
- Quotation templates
- Subscription lines and lifecycle state
- Invoices, totals, tax, discount, payment status, and balance due
- Payments with method, amount, date, and note
- Finance metrics and overdue risk records

## Run the working demo

From this directory:

```powershell
python -m digital_twin.demo
```

The demo prints live metrics, a 10% plan-price simulation, a discount simulation, and detected risks. Simulations operate on a deep copy and do not mutate the live state.

## Next integration step

Expose `TwinEngine` through FastAPI or Odoo controllers. Add an agent layer that maps natural-language questions to approved engine methods such as `simulate_price_change`, `simulate_discount`, `metrics`, and `risks`. Keep all money calculations inside `TwinEngine`.
