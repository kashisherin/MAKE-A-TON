# Brightloop Subscription Control Tower

Brightloop is a subscription-management platform with a safe Digital Twin and local Llama agent. It models products, plans, quotations, subscriptions, invoices, discounts, taxes, payments, overdue revenue, renewals, and upgrade opportunities.

## Highlights

- Premium Streamlit executive dashboard
- Synthetic database with 300 customers
- Subscription, invoice, payment, and revenue metrics
- Digital Twin simulations for pricing and discounts
- Revenue target planning
- Billing-run preview
- Renewal forecast
- Upgrade recommendations
- Overdue-risk detection
- Approval queue for simulated proposals
- Local Llama/Ollama natural-language agent
- CSV data export

## Quick start on Windows

```powershell
pip install -r requirements.txt
streamlit run app.py
```

Open the local URL shown by Streamlit, normally `http://localhost:8501`.

## Enable the local AI agent

Install Ollama from [ollama.com](https://ollama.com), then run:

```powershell
ollama pull llama3.2
```

Open the dashboard, select **Digital Twin Agent**, and enable **Use local Llama/Ollama model**.

The AI interprets natural-language questions. Python performs all financial calculations through the deterministic Digital Twin engine.

## Example questions

- What happens if we increase Core Monthly by 10%?
- How can we reach 3,000,000 collected, and how many subscribers are needed?
- Which invoices are overdue?
- Show me a billing preview.
- Which customers should receive an upgrade offer?
- What renewals are due soon?

## Project structure

```text
app.py                         Streamlit dashboard
digital_twin/models.py         Business entities and state model
digital_twin/engine.py         Deterministic calculations and simulations
digital_twin/agent.py          Llama routing and approved AI tools
digital_twin/sqlite_loader.py  SQLite-to-twin loader
digital_twin/create_database.py Synthetic data generator
digital_twin/run_sqlite_demo.py Database-backed command-line demo
outputs/brightloop_300_clients.sqlite3  Synthetic SQLite dataset
outputs/brightloop_300_clients.csv       Customer export
SETUP_AND_HANDOFF.md          Full handoff and customization guide
```

## Data safety

The included customer records are synthetic demo data. Do not replace them with real customer data before publishing a public repository. Do not commit API keys, passwords, `.env` files, or downloaded model files.

## Architecture

```text
User question -> Llama intent routing -> approved TwinEngine tool -> exact calculation -> dashboard explanation
```

The model cannot execute arbitrary Python, SQL, or shell commands. Simulations run on isolated copies and do not change the source database.
