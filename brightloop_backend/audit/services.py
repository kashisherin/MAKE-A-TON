from .models import AuditLog


def record_audit(user, action, entity, before=None, after=None, metadata=None):
    """
    Creates an immutable audit log entry for important system operations.
    """
    is_authenticated = bool(user and getattr(user, 'is_authenticated', False))
    user_obj = user if is_authenticated else None
    user_role = getattr(user, 'role', 'SYSTEM') if is_authenticated else 'SYSTEM'

    entity_type = entity.__class__.__name__
    entity_id = str(getattr(entity, 'pk', ''))

    return AuditLog.objects.create(
        user=user_obj,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_values=before or {},
        after_values=after or {},
        metadata=metadata or {}
    )
