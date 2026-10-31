from datetime import date
import unittest
from pathlib import Path

from digital_twin.engine import TwinEngine
from digital_twin.seed_data import build_demo_state
from digital_twin.sqlite_loader import load_twin_from_sqlite, validate_twin


class TwinEngineTests(unittest.TestCase):
    def test_sqlite_database_loads_into_twin(self):
        db = Path(__file__).resolve().parent.parent / "outputs" / "brightloop_300_clients.sqlite3"
        state = load_twin_from_sqlite(db, as_of=date(2026, 10, 31))
        validation = validate_twin(state)
        self.assertEqual(validation["customers"], 300)
        self.assertEqual(validation["subscriptions"], 300)
        self.assertEqual(validation["orphan_subscriptions"], 0)
        self.assertEqual(validation["orphan_invoices"], 0)
        self.assertEqual(validation["orphan_payments"], 0)

    def test_seed_contains_required_entities(self):
        state = build_demo_state()
        self.assertTrue(state.products and state.plans and state.quote_templates)
        self.assertTrue(state.subscriptions and state.invoices and state.payments)
        self.assertEqual({u.role.value for u in state.users}, {"admin", "staff", "customer"})


    def test_price_simulation_does_not_mutate_live_state(self):
        state = build_demo_state()
        engine = TwinEngine(state)
        before = state.plans[0].price
        result = engine.simulate_price_change(1, 10)
        self.assertEqual(result["delta"]["total_invoiced"], 1888.0)
        self.assertEqual(state.plans[0].price, before)


    def test_duplicate_billing_is_blocked(self):
        state = build_demo_state()
        engine = TwinEngine(state)
        engine.generate_invoice(state, 3)
        with self.assertRaisesRegex(ValueError, "Duplicate billing"):
            engine.generate_invoice(state, 3)


    def test_partial_payment_is_recorded(self):
        state = build_demo_state()
        engine = TwinEngine(state)
        payment = engine.record_payment(state, 1, "bank_transfer", 1000, "Partial settlement")
        self.assertEqual(payment.amount, 1000)
        self.assertEqual(state.invoices[0].payment_status.value, "partial")
