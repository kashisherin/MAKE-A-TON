from datetime import date, timedelta
import uuid
from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Subscription, SubscriptionLine, SubscriptionHistory, RenewalRecord
from audit.services import record_audit


def add_period(base_date, frequency):
    if frequency == 'DAILY':
        return base_date + timedelta(days=1)
    if frequency == 'WEEKLY':
        return base_date + timedelta(weeks=1)
    if frequency == 'MONTHLY':
        return base_date + relativedelta(months=1)
    if frequency == 'YEARLY':
        return base_date + relativedelta(years=1)
    raise ValidationError(f"Unsupported billing frequency: '{frequency}'.")


def _record_transition(subscription, user, new_status, action, details=None):
    old_status = subscription.status
    subscription.status = new_status
    subscription.save()

    SubscriptionHistory.objects.create(
        subscription=subscription,
        from_status=old_status,
        to_status=new_status,
        action=action,
        performed_by=user if getattr(user, 'is_authenticated', False) else None,
        details=details or {}
    )

    record_audit(
        user,
        action,
        subscription,
        before={'status': old_status},
        after={'status': new_status},
        metadata=details
    )
    return subscription


@transaction.atomic
def create_subscription(*, customer, plan, user, start_date=None, quantity=1, lines=None, quotation=None, payment_terms=''):
    today = timezone.localdate()
    start_date = start_date or today

    if not plan.is_active:
        raise ValidationError('The selected subscription plan is inactive.')

    if plan.available_from and start_date < plan.available_from:
        raise ValidationError(f"Plan is not available before {plan.available_from}.")

    if plan.available_until and start_date > plan.available_until:
        raise ValidationError(f"Plan availability expired on {plan.available_until}.")

    if quantity < plan.minimum_quantity:
        raise ValidationError(f"Subscription quantity ({quantity}) must meet or exceed the plan minimum quantity ({plan.minimum_quantity}).")

    expiry = add_period(start_date, plan.billing_frequency)
    short_id = uuid.uuid4().hex[:6].upper()
    sub_number = f"BL-{timezone.now():%Y%m%d%H%M%S}-{short_id}"

    initial_status = Subscription.Status.QUOTATION if quotation else Subscription.Status.DRAFT

    subscription = Subscription.objects.create(
        number=sub_number,
        customer=customer,
        plan=plan,
        quotation=quotation,
        start_date=start_date,
        expiry_date=expiry,
        billing_frequency=plan.billing_frequency,
        payment_terms=payment_terms,
        quantity=quantity,
        status=initial_status,
        created_by=user,
        next_renewal_date=expiry
    )

    if lines:
        for line in lines:
            prod = line.get('product')
            var = line.get('variant')
            if var and prod and var.product_id != prod.id:
                raise ValidationError(f"Variant '{var.variant_name}' does not belong to product '{prod.name}'.")
            SubscriptionLine.objects.create(subscription=subscription, **line)

    SubscriptionHistory.objects.create(
        subscription=subscription,
        from_status='',
        to_status=subscription.status,
        action='CREATED',
        performed_by=user,
        details={'quantity': quantity, 'billing_frequency': plan.billing_frequency}
    )

    record_audit(
        user,
        'SUBSCRIPTION_CREATED',
        subscription,
        after={'number': subscription.number, 'status': subscription.status, 'customer_id': customer.id}
    )
    return subscription


@transaction.atomic
def transition(subscription_id, user, action, reason=''):
    subscription = Subscription.objects.select_for_update().select_related('plan').get(pk=subscription_id)
    today = timezone.localdate()

    if subscription.status == Subscription.Status.CLOSED:
        raise ValidationError('A closed subscription cannot be modified or reactivated.')

    if action == 'confirm':
        if subscription.status not in (Subscription.Status.DRAFT, Subscription.Status.QUOTATION):
            raise ValidationError(f"Cannot confirm subscription from status '{subscription.status}'.")
        return _record_transition(subscription, user, Subscription.Status.CONFIRMED, 'CONFIRMED')

    if action == 'activate':
        if subscription.status != Subscription.Status.CONFIRMED:
            raise ValidationError(f"Only CONFIRMED subscriptions can be activated (current status: '{subscription.status}').")
        subscription.activated_at = today
        subscription.expiry_date = add_period(today, subscription.billing_frequency)
        subscription.next_renewal_date = subscription.expiry_date
        subscription.save(update_fields=['activated_at', 'expiry_date', 'next_renewal_date'])
        return _record_transition(subscription, user, Subscription.Status.ACTIVE, 'ACTIVATED')

    if action == 'pause':
        if subscription.status != Subscription.Status.ACTIVE:
            raise ValidationError(f"Only ACTIVE subscriptions can be paused (current status: '{subscription.status}').")
        if not subscription.plan.pause_allowed:
            raise ValidationError('The subscription plan does not permit pausing.')
        subscription.pause_date = today
        subscription.save(update_fields=['pause_date'])
        return _record_transition(subscription, user, Subscription.Status.PAUSED, 'PAUSED', {'pause_date': str(today)})

    if action == 'resume':
        if subscription.status != Subscription.Status.PAUSED:
            raise ValidationError(f"Only PAUSED subscriptions can be resumed (current status: '{subscription.status}').")
        paused_days = (today - subscription.pause_date).days if subscription.pause_date else 0
        days_to_add = max(paused_days, 0)
        subscription.expiry_date += timedelta(days=days_to_add)
        subscription.next_renewal_date = subscription.expiry_date
        subscription.pause_date = None
        subscription.save(update_fields=['expiry_date', 'next_renewal_date', 'pause_date'])
        return _record_transition(
            subscription,
            user,
            Subscription.Status.ACTIVE,
            'RESUMED',
            {'paused_days': days_to_add, 'new_expiry': str(subscription.expiry_date)}
        )

    if action == 'close':
        # Apply early-closure policy to BOTH ACTIVE and PAUSED subscriptions when today < expiry_date
        if subscription.status in (Subscription.Status.ACTIVE, Subscription.Status.PAUSED) and today < subscription.expiry_date:
            if not subscription.plan.early_closure_allowed:
                raise ValidationError('The subscription plan does not permit early closure.')
        subscription.closure_date = today
        subscription.closure_reason = reason
        subscription.save(update_fields=['closure_date', 'closure_reason'])
        return _record_transition(subscription, user, Subscription.Status.CLOSED, 'CLOSED', {'reason': reason})

    raise ValidationError(f"Operation '{action}' is not supported from status '{subscription.status}'.")


@transaction.atomic
def renew(subscription_id, user, idempotency_key):
    if not idempotency_key:
        raise ValidationError('An idempotency_key is required for renewals to prevent duplicate processing.')

    subscription = Subscription.objects.select_for_update().select_related('plan').get(pk=subscription_id)

    if RenewalRecord.objects.filter(idempotency_key=idempotency_key).exists():
        raise ValidationError('Duplicate renewal request: a renewal with this idempotency key already exists.')

    if subscription.status != Subscription.Status.ACTIVE:
        raise ValidationError(f"Only ACTIVE subscriptions can be renewed (current status: '{subscription.status}').")

    if not subscription.plan.renewal_allowed:
        raise ValidationError('The subscription plan does not permit renewals.')

    previous_expiry = subscription.expiry_date
    new_expiry = add_period(previous_expiry, subscription.billing_frequency)

    RenewalRecord.objects.create(
        subscription=subscription,
        previous_expiry=previous_expiry,
        new_expiry=new_expiry,
        renewed_by=user,
        idempotency_key=idempotency_key
    )

    subscription.expiry_date = new_expiry
    subscription.next_renewal_date = new_expiry
    subscription.save(update_fields=['expiry_date', 'next_renewal_date'])

    SubscriptionHistory.objects.create(
        subscription=subscription,
        from_status=subscription.status,
        to_status=subscription.status,
        action='RENEWED',
        performed_by=user,
        details={
            'idempotency_key': idempotency_key,
            'previous_expiry': str(previous_expiry),
            'new_expiry': str(new_expiry)
        }
    )

    record_audit(
        user,
        'SUBSCRIPTION_RENEWED',
        subscription,
        before={'expiry_date': str(previous_expiry)},
        after={'expiry_date': str(new_expiry)},
        metadata={'idempotency_key': idempotency_key}
    )
    return subscription
