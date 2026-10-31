from dataclasses import dataclass
from typing import Protocol

@dataclass(frozen=True)
class SubscriptionSnapshot:
    subscription_id: str
    customer_id: str
    organization_id: str | None
    plan_id: str
    status: str
    billing_interval: str
    currency: str

class SubscriptionProvider(Protocol):
    def get_billable_subscriptions(self, as_of_iso: str) -> list[SubscriptionSnapshot]:
        """Return subscriptions due for billing; adapter to main platform."""
        ...

class UsageProvider(Protocol):
    def get_usage_summary(self, customer_id: str, period_start_iso: str, period_end_iso: str) -> dict:
        """Return normalized usage facts; do not return precomputed savings claims."""
        ...
