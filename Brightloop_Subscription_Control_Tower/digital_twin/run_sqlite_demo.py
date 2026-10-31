from pathlib import Path
from pprint import pprint

from .engine import TwinEngine
from .sqlite_loader import load_twin_from_sqlite, validate_twin


def main():
    db = Path(__file__).resolve().parent.parent / "outputs" / "brightloop_300_clients.sqlite3"
    state = load_twin_from_sqlite(db, as_of=__import__("datetime").date(2026, 10, 31))
    engine = TwinEngine(state)
    print("LOADED DATABASE VALIDATION")
    pprint(validate_twin(state))
    print("\nDATABASE-BACKED METRICS")
    pprint(engine.metrics())
    print("\nDATABASE-BACKED PRICE SIMULATION")
    pprint(engine.simulate_price_change(plan_id=1, percent=10))
    print("\nDATABASE-BACKED RISKS")
    pprint(engine.risks()[:10])


if __name__ == "__main__":
    main()
