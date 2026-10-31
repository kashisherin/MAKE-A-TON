from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from subscriptions.models import Subscription, SubscriptionHistory
from audit.services import record_audit


class Command(BaseCommand):
    help = 'Automatically closes expired subscriptions whose plan has auto-close enabled.'

    def handle(self, *args, **options):
        today = timezone.localdate()
        expired_count = 0

        eligible_subscriptions = Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            expiry_date__lt=today,
            plan__auto_close_enabled=True
        ).select_related('plan')

        for sub in eligible_subscriptions:
            with transaction.atomic():
                locked = Subscription.objects.select_for_update().get(pk=sub.pk)
                if locked.status == Subscription.Status.ACTIVE and locked.expiry_date < today:
                    old_status = locked.status
                    locked.status = Subscription.Status.CLOSED
                    locked.closure_date = today
                    locked.closure_reason = 'Automatic expiry'
                    locked.save(update_fields=['status', 'closure_date', 'closure_reason'])

                    SubscriptionHistory.objects.create(
                        subscription=locked,
                        from_status=old_status,
                        to_status=Subscription.Status.CLOSED,
                        action='AUTO_EXPIRED',
                        performed_by=None,
                        details={'reason': 'Expiry date passed and plan has auto-close enabled.'}
                    )

                    record_audit(
                        None,
                        'AUTO_EXPIRED',
                        locked,
                        before={'status': old_status},
                        after={'status': Subscription.Status.CLOSED},
                        metadata={'closure_reason': 'Automatic expiry'}
                    )
                    expired_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully processed and closed {expired_count} expired subscription(s).'))
