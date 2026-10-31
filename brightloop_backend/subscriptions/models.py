from decimal import Decimal
from django.conf import settings
from django.db import models
from customers.models import Customer
from plans.models import Plan
from quotations.models import Quotation
from products.models import Product, ProductVariant


class Subscription(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        QUOTATION = 'QUOTATION', 'Quotation'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        ACTIVE = 'ACTIVE', 'Active'
        PAUSED = 'PAUSED', 'Paused'
        CLOSED = 'CLOSED', 'Closed'

    number = models.CharField(max_length=36, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='subscriptions')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='subscriptions')
    quotation = models.OneToOneField(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='subscription')
    start_date = models.DateField()
    expiry_date = models.DateField()
    billing_frequency = models.CharField(max_length=10, choices=Plan.Frequency.choices)
    payment_terms = models.CharField(max_length=120, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_subscriptions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    next_renewal_date = models.DateField(null=True, blank=True)
    pause_date = models.DateField(null=True, blank=True)
    closure_date = models.DateField(null=True, blank=True)
    closure_reason = models.TextField(blank=True)
    activated_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.number} - {self.customer} [{self.status}]"


class SubscriptionLine(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)
    tax_reference = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        item_name = self.variant.variant_name if self.variant else (self.product.name if self.product else 'Plan Item')
        return f"{item_name} x {self.quantity} = ₹{self.line_total}"


class SubscriptionHistory(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='history')
    from_status = models.CharField(max_length=12, blank=True)
    to_status = models.CharField(max_length=12)
    action = models.CharField(max_length=40)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    performed_at = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-performed_at']

    def __str__(self):
        return f"{self.subscription.number}: {self.from_status} -> {self.to_status} ({self.action})"


class RenewalRecord(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.PROTECT, related_name='renewals')
    previous_expiry = models.DateField()
    new_expiry = models.DateField()
    renewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    idempotency_key = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Renewal {self.idempotency_key} for {self.subscription.number}"
