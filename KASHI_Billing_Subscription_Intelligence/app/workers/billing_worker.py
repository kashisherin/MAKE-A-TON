import logging
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.domain.billing.engine import RecurringBillingEngine
from app.api.v1.endpoints.billing import DefaultSubscriptionAdapter

logger = logging.getLogger("kashi.workers.billing")


def run_recurring_billing_job(organization_id: str = "org_default"):
    """Scheduled task to execute recurring billing."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        logger.info(f"Starting recurring billing sweep for {organization_id} as of {now.isoformat()}")
        adapter = DefaultSubscriptionAdapter(db=db, org_id=organization_id)
        billing_run = RecurringBillingEngine.execute_billing_run(
            db=db,
            subscription_provider=adapter,
            as_of_date=now,
            organization_id=organization_id,
            run_type="scheduled",
            actor_id="cron_worker",
        )
        logger.info(
            f"Billing run {billing_run.id} finished: {billing_run.invoices_generated} invoices generated, "
            f"{billing_run.errors_count} errors."
        )
        return billing_run
    finally:
        db.close()

