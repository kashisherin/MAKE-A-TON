# Brightloop Subscription Control Tower

## What this project is

This is a subscription-management platform and Digital Twin for Brightloop Software.

It includes:

- 300 synthetic customers
- Users and roles: admin, staff, customer
- Products and variants
- Daily, weekly, monthly, and yearly plans
- Taxes and discount rules
- Quotations and quotation lines
- Subscriptions and lifecycle states
- Invoices and payments
- Outstanding and overdue revenue tracking
- A Digital Twin simulation engine
- A local Llama/Ollama agent for natural-language questions
- A premium Streamlit dashboard

## Run on Windows

### 1. Extract the ZIP

Extract the project folder somewhere convenient, for example:

```text
C:\Brightloop\files-mentioned-by-the-user-subscription
```

Open Command Prompt or PowerShell in that folder.

### 2. Install Python dependencies

```powershell
pip install streamlit pandas
```

The core Digital Twin uses Python’s standard library. Streamlit and pandas are needed for the dashboard.

### 3. Install Ollama

Install Ollama from:

https://ollama.com/

After installation, open a new terminal and download the local model:

```powershell
ollama pull llama3.2
```

Confirm it is installed:

```powershell
ollama list
```

The expected model is:

```text
llama3.2:latest
```

Ollama must be running locally on its default address:

```text
http://localhost:11434
```

### 4. Start the dashboard

From the folder containing `app.py`:

```powershell
streamlit run app.py
```

Open the URL shown in the terminal, normally:

```text
http://localhost:8501
```

### 5. Enable the AI agent

Inside the dashboard:

1. Open `Digital Twin Agent` in the sidebar.
2. Turn on `Use local Llama/Ollama model`.
3. Ask a question.

Example questions:

```text
What happens if we increase Core Monthly by 10%?
```

```text
How can we reach 3,000,000 collected, and how many subscribers are needed?
```

```text
Which customers should receive an upgrade offer?
```

```text
Show me a billing preview.
```

## Source-code map

### `app.py`

The Streamlit dashboard entry point.

It contains:

- Premium visual theme and CSS
- Sidebar navigation
- Overview dashboard
- Digital Twin Agent chat interface
- Scenario simulator
- Revenue-risk view
- Data explorer
- CSV download buttons
- Approval queue for simulated proposals

The UI should call the existing engine and agent functions rather than duplicating financial calculations.

### `digital_twin/models.py`

Defines the business entities and enums:

- `User`
- `Customer`
- `Product`
- `ProductVariant`
- `Plan`
- `TaxRule`
- `DiscountRule`
- `QuoteTemplate`
- `Subscription`
- `SubscriptionLine`
- `Invoice`
- `Payment`
- `TwinState`

### `digital_twin/create_database.py`

Creates the synthetic SQLite dataset.

It generates:

- 300 customers
- 300 subscriptions
- 300 quotations
- Invoices and payments
- Products, plans, discounts, taxes, and users

Run it only if the database needs to be regenerated:

```powershell
python digital_twin/create_database.py
```

### `digital_twin/sqlite_loader.py`

Loads SQLite records into the in-memory Digital Twin model.

It also validates relationships and reports orphaned subscriptions, invoices, and payments.

### `digital_twin/engine.py`

The deterministic business-logic engine.

It handles:

- Revenue calculations
- Tax calculations
- Discount calculations
- Invoice generation
- Payment recording
- Duplicate-billing protection
- Finance metrics
- Overdue-risk detection
- Price simulations
- Discount simulations
- Collected-revenue target planning
- Billing previews
- Renewal forecasting
- Upgrade recommendations

This file must remain the source of truth for financial calculations. Llama should never calculate money directly.

### `digital_twin/agent.py`

The AI orchestration layer.

It:

1. Receives a natural-language question.
2. Uses Llama/Ollama to identify intent when enabled.
3. Maps the question to an approved tool.
4. Calls the deterministic `TwinEngine`.
5. Returns an explanation and structured result.

Approved tools include:

- `metrics`
- `risks`
- `simulate_price_change`
- `simulate_discount`
- `plan_collected_target`
- `billing_preview`
- `renewal_forecast`
- `upgrade_recommendations`

Do not allow the model to execute arbitrary Python, SQL, or shell commands.

### `digital_twin/seed_data.py`

Creates a small in-memory demo state for local engine demonstrations.

### `digital_twin/demo.py`

Runs the original in-memory Digital Twin demonstration.

### `digital_twin/run_sqlite_demo.py`

Loads the 300-client SQLite database and prints database-backed metrics, simulations, and risks.

Run it with:

```powershell
python -m digital_twin.run_sqlite_demo
```

### `outputs/brightloop_300_clients.sqlite3`

The synthetic SQLite database used by the dashboard.

### `outputs/brightloop_300_clients.csv`

A flat export of the 300 synthetic customers.

## AI behaviour and safety rules

The correct architecture is:

```text
User question
    -> Llama understands intent
    -> Approved tool selected
    -> Python Digital Twin calculates exact result
    -> Dashboard explains result
```

Llama is used for language understanding, not financial arithmetic.

If a question is ambiguous, the agent should ask for clarification rather than guess. Any future feature that changes live records should require explicit human approval.

## Premium UI handoff notes

The current dashboard already uses a premium purple, charcoal, and gold visual language. If improving the UI further:

- Preserve the dark-purple/gold brand palette.
- Keep KPI cards, rounded panels, soft shadows, and generous spacing.
- Keep the main hero header and executive summary visible.
- Use charts and short insight cards instead of raw dictionaries.
- Keep raw database tables inside `Data Explorer`, not the main overview.
- Keep AI answers readable and show the underlying tool result only as supporting detail.
- Do not remove the simulator, approval queue, or risk views when redesigning.

## Common problems

### `ollama` is not recognized

Open a new terminal after installing Ollama. If needed, run it using its default Windows path:

```powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```

### The AI falls back to the basic parser

Check that Ollama is running and that the model exists:

```powershell
ollama list
```

Then verify the local service:

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

### The dashboard cannot find the database

Run Streamlit from the project folder containing both `app.py` and the `outputs` directory.

### Port 8501 is busy

Run:

```powershell
streamlit run app.py --server.port 8502
```
