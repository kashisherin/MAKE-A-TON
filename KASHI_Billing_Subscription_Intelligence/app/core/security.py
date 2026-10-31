from dataclasses import dataclass, field
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    BILLING_SPECIALIST = "billing_specialist"
    AUDITOR = "auditor"
    CUSTOMER = "customer"
    SYSTEM = "system"


@dataclass
class TenantContext:
    organization_id: str = "org_default"
    actor_id: str = "system_actor"
    roles: list[str] = field(default_factory=lambda: [UserRole.ADMIN.value])

    def has_role(self, required_role: str) -> bool:
        if UserRole.ADMIN.value in self.roles:
            return True
        return required_role in self.roles

