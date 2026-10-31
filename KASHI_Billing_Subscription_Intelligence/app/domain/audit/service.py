import json
from typing import Any
from sqlalchemy.orm import Session
from app.models.financial import AuditLog


class AuditService:
    @staticmethod
    def sanitize_payload(payload: dict[str, Any] | None) -> str | None:
        if not payload:
            return None
        sensitive_keys = {"password", "secret", "token", "cvv", "card_number", "pan", "key"}
        sanitized = {}
        for k, v in payload.items():
            if any(s in k.lower() for s in sensitive_keys):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = v
        return json.dumps(sanitized, default=str)

    @classmethod
    def record_event(
        cls,
        db: Session,
        entity_type: str,
        entity_id: str,
        action: str,
        actor_id: str | None = None,
        organization_id: str | None = None,
        correlation_id: str | None = None,
        before_state: dict[str, Any] | None = None,
        after_state: dict[str, Any] | None = None,
    ) -> AuditLog:
        audit_entry = AuditLog(
            organization_id=organization_id,
            entity_type=entity_type,
            entity_id=str(entity_id),
            action=action,
            actor_id=actor_id,
            correlation_id=correlation_id,
            before_json=cls.sanitize_payload(before_state),
            after_json=cls.sanitize_payload(after_state),
        )
        db.add(audit_entry)
        return audit_entry

