from typing import Annotated
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import TenantContext, UserRole


def get_tenant_context(
    x_organization_id: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_role: Annotated[str | None, Header()] = None,
    x_correlation_id: Annotated[str | None, Header()] = None,
) -> TenantContext:
    org_id = x_organization_id or "org_default"
    actor_id = x_user_id or "actor_default"
    role = x_user_role or UserRole.ADMIN.value
    return TenantContext(
        organization_id=org_id,
        actor_id=actor_id,
        roles=[role],
    )


def require_role(required_role: str):
    def role_checker(ctx: Annotated[TenantContext, Depends(get_tenant_context)]) -> TenantContext:
        if not ctx.has_role(required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires '{required_role}' role permission.",
            )
        return ctx
    return role_checker

