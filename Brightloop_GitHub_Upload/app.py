from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from digital_twin.engine import TwinEngine
from digital_twin.agent import ask, ask_ollama
from digital_twin.sqlite_loader import load_twin_from_sqlite


st.set_page_config(page_title="Brightloop | Revenue Intelligence", page_icon="◈", layout="wide", initial_sidebar_state="expanded")

DB_PATH = Path(__file__).resolve().parent / "outputs" / "brightloop_300_clients.sqlite3"
STATE = load_twin_from_sqlite(DB_PATH, as_of=__import__("datetime").date(2026, 10, 31))
ENGINE = TwinEngine(STATE)

st.markdown("""
<style>
    .stApp { background: radial-gradient(circle at 8% 0%,#fffaf0 0,#f7f3f8 33%,#f2eef5 100%); }
    [data-testid="stSidebar"] { background: linear-gradient(180deg,#211727 0%,#35233d 100%); border-right: 1px solid #5d4568; }
    [data-testid="stSidebar"] * { color: #f7f2fa !important; }
    .hero { background: linear-gradient(120deg,#23172e 0%,#5b3b67 62%,#8d6a45 100%); padding: 30px 34px; border-radius: 22px; color: white; margin-bottom: 24px; box-shadow: 0 16px 38px rgba(55,33,67,.22); border: 1px solid rgba(255,255,255,.14); }
    .hero h1 { margin: 0; font-size: 2.45rem; letter-spacing: -1.5px; font-weight: 800; }
    .hero p { margin: 8px 0 0; color: #eadff0; font-size: 1.02rem; }
    .kpi { background: rgba(255,255,255,.84); backdrop-filter: blur(8px); border: 1px solid #e6dce9; border-radius: 16px; padding: 18px 20px; min-height: 112px; box-shadow: 0 8px 24px rgba(55,33,67,.07); }
    .kpi-label { color: #756a7a; font-size: .75rem; text-transform: uppercase; letter-spacing: .12em; font-weight: 700; }
    .kpi-value { color: #2b2030; font-weight: 800; font-size: 1.68rem; margin-top: 8px; }
    .kpi-note { color: #8b7d90; font-size: .8rem; margin-top: 5px; }
    .section { color: #4b3158; font-weight: 800; font-size: 1.22rem; margin: 24px 0 11px; letter-spacing: -.2px; }
    .insight { background: linear-gradient(90deg,#fff6d8,#fffaf0); border-left: 5px solid #d79525; padding: 14px 17px; border-radius: 10px; color: #54442a; margin: 12px 0; box-shadow: 0 5px 16px rgba(130,90,20,.06); }
    div[data-testid="stMetric"] { background: rgba(255,255,255,.86); border: 1px solid #e9e2ed; padding: 13px; border-radius: 14px; }
    .chat-card { background: white; border: 1px solid #e7ddea; border-radius: 15px; padding: 16px; box-shadow: 0 7px 18px rgba(55,33,67,.06); }
    .badge { display:inline-block; padding:4px 9px; border-radius:99px; background:#eee5f1; color:#5b3b67; font-size:.72rem; font-weight:700; letter-spacing:.04em; }
</style>
""", unsafe_allow_html=True)


def money(value: float) -> str:
    return f"₹{value:,.0f}"


def pretty_result(tool, result):
    if tool == "metrics":
        st.markdown("#### Current business snapshot")
        cols = st.columns(4)
        labels = [("Active subscriptions", result["active_subscriptions"]), ("Total invoiced", money(result["total_invoiced"])), ("Collected", money(result["collected_revenue"])), ("Overdue", money(result["overdue_amount"]))]
        for col, (label, value) in zip(cols, labels):
            with col:
                st.metric(label, value)
    elif tool == "risks":
        st.markdown("#### Revenue risks found")
        st.metric("Actionable risks", len(result))
        if result:
            rows = [{"Type": x["type"].replace("_", " ").title(), "Severity": x["severity"].title(), "Amount": money(x["amount"]) if "amount" in x else "—", "Recommendation": x["recommendation"]} for x in result]
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    elif tool == "plan_collected_target":
        st.markdown("#### Target collection plan")
        cols = st.columns(4)
        values = [("Target", money(result["target_collected"])), ("Current", money(result["current_collected"])), ("Gap", money(result["gap"])), ("Subscribers needed", f"{result['additional_subscribers_needed']:,}")]
        for col, (label, value) in zip(cols, values):
            with col:
                st.metric(label, value)
        st.info(result["recommendation"])
    elif tool == "billing_preview":
        st.markdown("#### Billing run preview")
        cols = st.columns(4)
        for col, (label, value) in zip(cols, [("Invoices to create", result["invoices_to_create"]), ("Projected revenue", money(result["projected_revenue"])), ("Already billed", result["already_billed"]), ("Status", "Ready")]):
            with col:
                st.metric(label, value)
    elif tool == "renewal_forecast":
        st.markdown("#### Renewal forecast")
        cols = st.columns(3)
        for col, (label, value) in zip(cols, [("Renewals due", result["renewals_due"]), ("Window", f"{result['window_days']} days"), ("Estimated value", money(result["estimated_renewal_value"]))]):
            with col:
                st.metric(label, value)
    elif tool == "upgrade_recommendations":
        st.markdown("#### Upgrade opportunities")
        st.metric("Recommended accounts", len(result))
        if result:
            st.dataframe(pd.DataFrame(result), use_container_width=True, hide_index=True)
    else:
        st.markdown("#### Scenario comparison")
        cols = st.columns(4)
        delta = result["delta"]
        values = [("Affected subscriptions", result.get("affected_subscriptions", "—")), ("Invoice change", money(delta["total_invoiced"])), ("Outstanding change", money(delta["outstanding_revenue"])), ("Overdue change", money(delta["overdue_amount"]))]
        for col, (label, value) in zip(cols, values):
            with col:
                st.metric(label, value)
        comparison = pd.DataFrame({"Current": [result["before"]["total_invoiced"], result["before"]["outstanding_revenue"], result["before"]["overdue_amount"]], "Simulated": [result["after"]["total_invoiced"], result["after"]["outstanding_revenue"], result["after"]["overdue_amount"]]}, index=["Invoiced", "Outstanding", "Overdue"])
        st.bar_chart(comparison, height=240)


def kpi(label: str, value: str, note: str):
    st.markdown(f'<div class="kpi"><div class="kpi-label">{label}</div><div class="kpi-value">{value}</div><div class="kpi-note">{note}</div></div>', unsafe_allow_html=True)


st.sidebar.markdown("## ◈ BRIGHTLOOP")
st.sidebar.caption("Subscription Control Tower")
st.sidebar.markdown('<span class="badge">REVENUE INTELLIGENCE</span>', unsafe_allow_html=True)
st.sidebar.markdown("---")
view = st.sidebar.radio("Workspace", ["Overview", "Digital Twin Agent", "Digital Twin Simulator", "Revenue Risks", "Data Explorer"])
st.sidebar.markdown("---")
st.sidebar.caption("Digital Twin status")
st.sidebar.success("Connected to SQLite")
st.sidebar.caption(f"{len(STATE.customers)} customers • {len(STATE.subscriptions)} subscriptions")

st.markdown('<div class="hero"><h1>Subscription Control Tower</h1><p>Live operational metrics with a safe Digital Twin for revenue decisions.</p></div>', unsafe_allow_html=True)

metrics = ENGINE.metrics()

if view == "Overview":
    st.markdown('<div class="section">Business pulse</div>', unsafe_allow_html=True)
    cols = st.columns(5)
    with cols[0]: kpi("Active subscriptions", f"{metrics['active_subscriptions']:,}", "currently running")
    with cols[1]: kpi("Total invoiced", money(metrics["total_invoiced"]), "all non-cancelled invoices")
    with cols[2]: kpi("Collected revenue", money(metrics["collected_revenue"]), "payments recorded")
    with cols[3]: kpi("Outstanding", money(metrics["outstanding_revenue"]), "still to be collected")
    with cols[4]: kpi("Overdue amount", money(metrics["overdue_amount"]), f"{metrics['overdue_invoices']} overdue invoices")

    st.markdown('<div class="section">Revenue and subscription mix</div>', unsafe_allow_html=True)
    left, right = st.columns([1.25, 1])
    with left:
        inv = pd.DataFrame([{"Category": "Collected", "Amount": metrics["collected_revenue"]}, {"Category": "Outstanding", "Amount": metrics["outstanding_revenue"]}, {"Category": "Overdue", "Amount": metrics["overdue_amount"]}]).set_index("Category")
        st.bar_chart(inv, color="#6b4778", height=300)
    with right:
        statuses = pd.Series([s.status.value for s in STATE.subscriptions]).value_counts().rename_axis("Status").to_frame("Subscriptions")
        st.bar_chart(statuses, color="#f5a623", height=300)

    st.markdown('<div class="section">Executive insight</div>', unsafe_allow_html=True)
    risk_ratio = metrics["overdue_amount"] / max(metrics["total_invoiced"], 1)
    st.markdown(f'<div class="insight"><b>{metrics["overdue_invoices"]} invoices need attention.</b> Overdue exposure is {risk_ratio:.1%} of total invoiced revenue. Open Digital Twin Simulator to test a pricing or discount decision before applying it.</div>', unsafe_allow_html=True)

elif view == "Digital Twin Agent":
    st.markdown('<div class="section">Ask the Digital Twin</div>', unsafe_allow_html=True)
    use_llama = st.toggle("Use local Llama/Ollama model", value=False, help="Requires Ollama running locally with a model such as llama3.2 or qwen2.5:7b.")
    st.markdown('<div class="insight"><b>Decision intelligence, grounded in your data.</b><br/>Llama interprets the question. The Digital Twin calculates the money. Approved tools keep the agent from inventing financial results.</div>', unsafe_allow_html=True)
    st.caption("Try a prompt")
    prompt_cols = st.columns(4)
    quick_prompts = ["How much revenue is overdue?", "Can we reach ₹3,000,000 collected?", "What if Core Monthly rises 10%?", "Which customers should upgrade?"]
    for col, prompt in zip(prompt_cols, quick_prompts):
        if col.button(prompt, key=f"quick_{prompt}"):
            st.session_state.pending_question = prompt
    if "chat" not in st.session_state:
        st.session_state.chat = []
    for message in st.session_state.chat:
        with st.chat_message(message["role"]):
            st.write(message["content"])
            if message.get("result") is not None:
                pretty_result(message.get("tool", "metrics"), message["result"])
    question = st.session_state.pop("pending_question", None) or st.chat_input("Ask about revenue, renewals, pricing, or risk...")
    if question:
        st.session_state.chat.append({"role": "user", "content": question})
        response = ask_ollama(ENGINE, question, model="llama3.2") if use_llama else ask(ENGINE, question)
        st.session_state.chat.append({"role": "assistant", "content": response["answer"], "tool": response["tool"], "result": response["result"], "model": response.get("model", "deterministic router")})
        st.rerun()

elif view == "Digital Twin Simulator":
    st.markdown('<div class="section">Safe scenario lab</div>', unsafe_allow_html=True)
    st.info("Simulations run on an isolated copy. Live database records are not changed.")
    scenario = st.selectbox("Scenario", ["Plan price change", "Discount change"])
    if scenario == "Plan price change":
        plan = st.selectbox("Plan", STATE.plans, format_func=lambda p: f"{p.name} — ₹{p.price:,.0f} / {p.billing_frequency}")
        pct = st.slider("Price change (%)", -30, 50, 10)
        result = ENGINE.simulate_price_change(plan.id, pct)
    else:
        discount = st.selectbox("Discount rule", STATE.discounts, format_func=lambda d: d.name)
        pct = st.slider("New discount (%)", 0, 40, int(discount.value))
        result = ENGINE.simulate_discount(discount.id, pct)

    st.markdown('<div class="section">Simulation result</div>', unsafe_allow_html=True)
    before, after, delta = result["before"], result["after"], result["delta"]
    cols = st.columns(4)
    with cols[0]: kpi("Affected subscriptions", f"{result.get('affected_subscriptions', '—')}", "in this scenario")
    with cols[1]: kpi("Invoice impact", money(delta["total_invoiced"]), "change vs current")
    with cols[2]: kpi("Outstanding impact", money(delta["outstanding_revenue"]), "change vs current")
    with cols[3]: kpi("Overdue impact", money(delta["overdue_amount"]), "change vs current")
    comparison = pd.DataFrame({"Current": [before["total_invoiced"], before["outstanding_revenue"], before["overdue_amount"]], "Simulated": [after["total_invoiced"], after["outstanding_revenue"], after["overdue_amount"]]}, index=["Total invoiced", "Outstanding", "Overdue"])
    st.bar_chart(comparison, height=300)
    if delta["overdue_amount"] > 0:
        st.warning("This scenario increases overdue exposure. Review customer impact before applying it.")
    else:
        st.success("This scenario does not increase overdue exposure in the current dataset.")
    if "proposals" not in st.session_state:
        st.session_state.proposals = []
    if st.button("Prepare proposal for approval"):
        st.session_state.proposals.append({"scenario": result["scenario"], "result": result, "status": "Pending approval"})
        st.success("Proposal created. Review it below before approving.")
    if st.session_state.proposals:
        st.markdown("#### Approval queue")
        for i, proposal in enumerate(st.session_state.proposals):
            with st.expander(f"{proposal['scenario']} — {proposal['status']}", expanded=True):
                st.write("This is a safe proposal. Approval records the decision; it does not modify the source database yet.")
                if proposal["status"] == "Pending approval":
                    c1, c2 = st.columns(2)
                    if c1.button("Approve", key=f"approve_{i}"):
                        proposal["status"] = "Approved"
                        st.rerun()
                    if c2.button("Reject", key=f"reject_{i}"):
                        proposal["status"] = "Rejected"
                        st.rerun()

elif view == "Revenue Risks":
    st.markdown('<div class="section">Revenue risks</div>', unsafe_allow_html=True)
    risks = ENGINE.risks()
    if risks:
        df = pd.DataFrame(risks)
        st.dataframe(df, use_container_width=True, hide_index=True)
        st.markdown(f'<div class="insight"><b>{len(risks)} actionable signals detected.</b> The current rules prioritize overdue invoices and discounts expiring within 30 days.</div>', unsafe_allow_html=True)
    else:
        st.success("No revenue risks detected.")

else:
    st.markdown('<div class="section">Data explorer</div>', unsafe_allow_html=True)
    entity = st.selectbox("Dataset", ["Customers", "Subscriptions", "Invoices", "Payments"])
    if entity == "Customers":
        df = pd.read_sql_query("SELECT * FROM customers LIMIT 300", __import__("sqlite3").connect(DB_PATH))
    elif entity == "Subscriptions":
        df = pd.read_sql_query("SELECT * FROM subscriptions LIMIT 300", __import__("sqlite3").connect(DB_PATH))
    elif entity == "Invoices":
        df = pd.read_sql_query("SELECT * FROM invoices LIMIT 300", __import__("sqlite3").connect(DB_PATH))
    else:
        df = pd.read_sql_query("SELECT * FROM payments LIMIT 300", __import__("sqlite3").connect(DB_PATH))
    st.dataframe(df, use_container_width=True, hide_index=True)
    st.download_button("Download CSV", df.to_csv(index=False).encode("utf-8"), file_name=f"brightloop_{entity.lower()}.csv", mime="text/csv")
