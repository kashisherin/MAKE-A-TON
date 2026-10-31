import logging
from app.core.database import SessionLocal
from app.domain.entitlements.service import EntitlementService

logger = logging.getLogger("kashi.workers.expiry")


def run_entitlement_expiry_sweep():
    """Background task to transition expired digital entitlements to 'expired' status."""
    db = SessionLocal()
    try:
        expired_count = EntitlementService.expire_stale_entitlements(db=db)
        logger.info(f"Entitlement expiry sweep completed: {expired_count} entitlements marked expired.")
        return expired_count
    finally:
        db.close()

