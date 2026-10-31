from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.financial import Entitlement, utc_now
from app.schemas.entitlements import (
    EntitlementGrantInput,
    EntitlementVerifyResponse,
)
from app.core.security import TenantContext
from app.domain.audit.service import AuditService


class EntitlementService:
    @classmethod
    def grant_entitlement(
        cls,
        db: Session,
        data: EntitlementGrantInput,
        ctx: TenantContext,
    ) -> Entitlement:
        org_id = data.organization_id or ctx.organization_id
        now = utc_now()

        expires_at = data.expires_at
        if data.duration_hours is not None:
            expires_at = now + timedelta(hours=data.duration_hours)

        entitlement = Entitlement(
            organization_id=org_id,
            customer_id=data.customer_id,
            feature_key=data.feature_key,
            name=data.name,
            status="active",
            granted_at=now,
            expires_at=expires_at,
            max_usage_limit=data.max_usage_limit,
            current_usage_count=0,
        )
        db.add(entitlement)

        AuditService.record_event(
            db=db,
            entity_type="Entitlement",
            entity_id=data.feature_key,
            action="GRANT_ENTITLEMENT",
            actor_id=ctx.actor_id,
            organization_id=org_id,
            after_state={
                "customer_id": data.customer_id,
                "feature_key": data.feature_key,
                "expires_at": str(expires_at),
            },
        )

        db.commit()
        db.refresh(entitlement)
        return entitlement

    @classmethod
    def verify_entitlement(
        cls,
        db: Session,
        customer_id: str,
        feature_key: str,
        organization_id: str,
    ) -> EntitlementVerifyResponse:
        now = datetime.now(timezone.utc)
        entitlement = db.scalar(
            select(Entitlement).where(
                and_(
                    Entitlement.customer_id == customer_id,
                    Entitlement.feature_key == feature_key,
                    Entitlement.organization_id == organization_id,
                    Entitlement.status == "active",
                )
            ).order_by(Entitlement.id.desc())
        )

        if not entitlement:
            return EntitlementVerifyResponse(
                is_entitled=False,
                feature_key=feature_key,
                customer_id=customer_id,
                status="not_found",
                expires_at=None,
                remaining_usage=None,
                reason="No active entitlement grant found for this feature.",
            )

        # Check time expiration
        if entitlement.expires_at:
            exp = entitlement.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if now > exp:
                entitlement.status = "expired"
                db.commit()
                return EntitlementVerifyResponse(
                    is_entitled=False,
                    feature_key=feature_key,
                    customer_id=customer_id,
                    status="expired",
                    expires_at=entitlement.expires_at,
                    remaining_usage=None,
                    reason=f"Entitlement expired on {entitlement.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}.",
                )

        # Check usage count limit
        if entitlement.max_usage_limit is not None:
            remaining = entitlement.max_usage_limit - entitlement.current_usage_count
            if remaining <= 0:
                entitlement.status = "exhausted"
                db.commit()
                return EntitlementVerifyResponse(
                    is_entitled=False,
                    feature_key=feature_key,
                    customer_id=customer_id,
                    status="exhausted",
                    expires_at=entitlement.expires_at,
                    remaining_usage=0,
                    reason="Entitlement usage limit exhausted.",
                )
            return EntitlementVerifyResponse(
                is_entitled=True,
                feature_key=feature_key,
                customer_id=customer_id,
                status="active",
                expires_at=entitlement.expires_at,
                remaining_usage=remaining,
            )

        return EntitlementVerifyResponse(
            is_entitled=True,
            feature_key=feature_key,
            customer_id=customer_id,
            status="active",
            expires_at=entitlement.expires_at,
            remaining_usage=None,
        )

    @classmethod
    def expire_stale_entitlements(cls, db: Session) -> int:
        """Background worker method to sweep and mark expired entitlements."""
        now = datetime.now(timezone.utc)
        stale = db.scalars(
            select(Entitlement).where(
                and_(
                    Entitlement.status == "active",
                    Entitlement.expires_at.is_not(None),
                    Entitlement.expires_at < now,
                )
            )
        ).all()
        for ent in stale:
            ent.status = "expired"
        db.commit()
        return len(stale)
