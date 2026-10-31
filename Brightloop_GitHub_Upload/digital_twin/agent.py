from __future__ import annotations

import json
import re
import urllib.request
from typing import Any

from .engine import TwinEngine


def _find_plan_id(engine: TwinEngine, question: str) -> int:
    q = question.lower()
    for plan in engine.state.plans:
        if plan.name.lower() in q or plan.name.split()[0].lower() in q:
            return plan.id
    return engine.state.plans[0].id


def _find_percentage(question: str, default: float = 10.0) -> float:
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*%", question)
    return float(match.group(1)) if match else default


def _find_money_target(question: str) -> float | None:
    match = re.search(r"(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)", question.lower())
    return float(match.group(1).replace(",", "")) if match else None


def classify_question(engine: TwinEngine, question: str) -> tuple[str, dict[str, Any]]:
    """Safe local parser. It only returns approved tools and validated arguments."""
    q = question.lower()
    if ("collected" in q and any(char.isdigit() for char in q)) or any(phrase in q for phrase in ["make collected", "reach collected", "collected money", "collected revenue", "target revenue"]):
        return "plan_collected_target", {"target": _find_money_target(question) or 3_000_000}
    if "billing" in q and any(word in q for word in ["preview", "run", "today", "invoice"]):
        return "billing_preview", {}
    if any(word in q for word in ["renewal", "renewals", "expire soon"]):
        return "renewal_forecast", {"days": 30}
    if any(word in q for word in ["upgrade", "upsell", "large team", "high seat"]):
        return "upgrade_recommendations", {}
    if any(word in q for word in ["overdue", "risk", "late", "unpaid", "outstanding"]):
        return "risks", {}
    if any(word in q for word in ["discount", "offer"]):
        discount_id = engine.state.discounts[0].id
        return "simulate_discount", {"discount_id": discount_id, "percent": _find_percentage(question, 15.0)}
    if any(word in q for word in ["price", "increase", "decrease", "raise", "lower"]):
        return "simulate_price_change", {"plan_id": _find_plan_id(engine, question), "percent": _find_percentage(question, 10.0)}
    return "metrics", {}


def run_tool(engine: TwinEngine, tool: str, arguments: dict[str, Any]) -> dict[str, Any] | list[dict[str, Any]]:
    if tool == "metrics":
        return engine.metrics()
    if tool == "risks":
        return engine.risks()
    if tool == "simulate_price_change":
        return engine.simulate_price_change(arguments["plan_id"], arguments["percent"])
    if tool == "simulate_discount":
        return engine.simulate_discount(arguments["discount_id"], arguments["percent"])
    if tool == "plan_collected_target":
        return engine.plan_collected_target(arguments["target"])
    if tool == "billing_preview":
        return engine.billing_preview()
    if tool == "renewal_forecast":
        return engine.renewal_forecast(arguments.get("days", 30))
    if tool == "upgrade_recommendations":
        return engine.upgrade_recommendations()
    raise ValueError(f"Tool not allowed: {tool}")


def explain_result(tool: str, result: Any) -> str:
    if tool == "metrics":
        return f"The twin currently shows ₹{result['total_invoiced']:,.0f} total invoiced, ₹{result['collected_revenue']:,.0f} collected, and ₹{result['overdue_amount']:,.0f} overdue across {result['active_subscriptions']} active subscriptions."
    if tool == "risks":
        return f"I found {len(result)} actionable revenue risks. The highest-priority items are overdue invoices requiring payment follow-up."
    if tool == "plan_collected_target":
        return f"To reach ₹{result['target_collected']:,.0f} collected, the business needs ₹{result['gap']:,.0f} more. At the current average of ₹{result['average_collected_per_active_subscriber']:,.0f} collected per active subscriber, you would need about {result['additional_subscribers_needed']:,} additional subscribers. Recovering overdue invoices could contribute up to ₹{result['suggested_overdue_recovery']:,.0f}; the remaining gap would need to come from renewals, upgrades, or new sales."
    if tool == "billing_preview":
        return f"The billing preview found {result['invoices_to_create']} invoices ready to create, with projected revenue of ₹{result['projected_revenue']:,.0f}. Duplicate protection would skip {result['already_billed']} already-billed subscriptions."
    if tool == "renewal_forecast":
        return f"There are {result['renewals_due']} renewals due within the next {result['window_days']} days, representing approximately ₹{result['estimated_renewal_value']:,.0f}."
    if tool == "upgrade_recommendations":
        return f"I found {len(result)} active subscriptions with high seat counts that may be good upgrade candidates."
    delta = result["delta"]
    direction = "increases" if delta["total_invoiced"] >= 0 else "decreases"
    return f"This scenario {direction} invoiced revenue by ₹{abs(delta['total_invoiced']):,.0f}. Outstanding revenue changes by ₹{delta['outstanding_revenue']:,.0f}, while overdue exposure changes by ₹{delta['overdue_amount']:,.0f}. This is a simulation only; live records were not changed."


def ask(engine: TwinEngine, question: str) -> dict[str, Any]:
    tool, arguments = classify_question(engine, question)
    result = run_tool(engine, tool, arguments)
    return {"question": question, "tool": tool, "arguments": arguments, "answer": explain_result(tool, result), "result": result}


def ask_ollama(engine: TwinEngine, question: str, model: str = "qwen2.5:7b") -> dict[str, Any]:
    """Use local Ollama for intent extraction, with a safe fallback."""
    prompt = f"""You are the Brightloop Digital Twin router. Choose exactly one approved tool and return JSON only.
Allowed format examples:
{{"tool":"metrics","arguments":{{}}}}
{{"tool":"risks","arguments":{{}}}}
{{"tool":"simulate_price_change","arguments":{{"plan_id":1,"percent":10}}}}
{{"tool":"simulate_discount","arguments":{{"discount_id":1,"percent":15}}}}
{{"tool":"plan_collected_target","arguments":{{"target":3000000}}}}
Available plans: {[(p.id, p.name) for p in engine.state.plans]}
Available discounts: {[(d.id, d.name) for d in engine.state.discounts]}
Question: {question}
"""
    payload = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode()
    request = urllib.request.Request("http://localhost:11434/api/generate", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
            raw = payload.get("response", "")
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                tool = parsed.get("tool")
                arguments = parsed.get("arguments", {})
                if tool in {"metrics", "risks", "simulate_price_change", "simulate_discount", "plan_collected_target"}:
                    # Deterministic intent guard: the model may explain language, but it
                    # must not downgrade an explicit scenario request to a metrics query.
                    expected_tool, expected_args = classify_question(engine, question)
                    if expected_tool != "metrics" and tool != expected_tool:
                        tool, arguments = expected_tool, expected_args
                    if tool == "plan_collected_target":
                        tool, arguments = expected_tool, expected_args
                    elif tool == "simulate_price_change":
                        arguments = {"plan_id": int(arguments.get("plan_id", engine.state.plans[0].id)), "percent": float(arguments.get("percent", 10))}
                    elif tool == "simulate_discount":
                        arguments = {"discount_id": int(arguments.get("discount_id", engine.state.discounts[0].id)), "percent": float(arguments.get("percent", 15))}
                    result = run_tool(engine, tool, arguments)
                    return {"question": question, "tool": tool, "arguments": arguments, "answer": explain_result(tool, result), "result": result, "model": model}
    except Exception:
        pass
    return ask(engine, question)
