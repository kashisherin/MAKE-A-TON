from pprint import pprint

from .engine import TwinEngine
from .seed_data import build_demo_state


def main():
    engine = TwinEngine(build_demo_state())
    print("LIVE METRICS")
    pprint(engine.metrics())
    print("\nPRICE SIMULATION: +10% ON BUSINESS MONTHLY")
    pprint(engine.simulate_price_change(plan_id=1, percent=10))
    print("\nDISCOUNT SIMULATION: 15% LARGE TEAM DISCOUNT")
    pprint(engine.simulate_discount(discount_id=1, percent=15))
    print("\nRISKS")
    pprint(engine.risks())


if __name__ == "__main__":
    main()
