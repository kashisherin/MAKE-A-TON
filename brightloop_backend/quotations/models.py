from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from customers.models import Customer
from products.models import Product, ProductVariant
from plans.models import Plan


class QuotationTemplate(models.Model):
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    validity_days = models.PositiveIntegerField(default=15)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (valid {self.validity_days} days)"


class QuotationTemplateLine(models.Model):
    template = models.ForeignKey(QuotationTemplate, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['id']

    def clean(self):
        if self.quantity < 1:
            raise ValidationError({'quantity': 'Quantity must be at least 1.'})
        if not self.product and not self.plan:
            raise ValidationError('A template line must reference either a product or a plan.')
        if self.variant and self.product and self.variant.product_id != self.product_id:
            raise ValidationError({'variant': f"Variant '{self.variant.variant_name}' does not belong to product '{self.product.name}'."})
        if self.variant and not self.product:
            self.product = self.variant.product

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class Quotation(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired'

    number = models.CharField(max_length=36, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='quotations')
    template = models.ForeignKey(QuotationTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_quotations')
    created_at = models.DateTimeField(auto_now_add=True)
    valid_until = models.DateField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    discount_reference = models.CharField(max_length=120, blank=True)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    converted = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['valid_until']),
        ]

    def __str__(self):
        return f"{self.number} - {self.customer} [{self.status}]"


class QuotationLine(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ['id']

    def clean(self):
        if self.quantity < 1:
            raise ValidationError({'quantity': 'Quantity must be at least 1.'})
        if self.unit_price is not None and self.unit_price < Decimal('0.00'):
            raise ValidationError({'unit_price': 'Unit price cannot be negative.'})
        if not self.product and not self.plan:
            raise ValidationError('A quotation line must reference either a product or a plan.')
        if self.variant and self.product and self.variant.product_id != self.product_id:
            raise ValidationError({'variant': f"Variant '{self.variant.variant_name}' does not belong to product '{self.product.name}'."})
        if self.variant and not self.product:
            self.product = self.variant.product

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
