from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models


class Plan(models.Model):
    class Frequency(models.TextChoices):
        DAILY = 'DAILY', 'Daily'
        WEEKLY = 'WEEKLY', 'Weekly'
        MONTHLY = 'MONTHLY', 'Monthly'
        YEARLY = 'YEARLY', 'Yearly'

    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    billing_frequency = models.CharField(max_length=10, choices=Frequency.choices)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    minimum_quantity = models.PositiveIntegerField(default=1)
    available_from = models.DateField(null=True, blank=True)
    available_until = models.DateField(null=True, blank=True)
    auto_close_enabled = models.BooleanField(default=True)
    early_closure_allowed = models.BooleanField(default=False)
    pause_allowed = models.BooleanField(default=False)
    renewal_allowed = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['billing_frequency']),
            models.Index(fields=['is_active']),
            models.Index(fields=['available_from', 'available_until']),
        ]

    def clean(self):
        if self.price is not None and self.price < Decimal('0.00'):
            raise ValidationError({'price': 'Plan price cannot be negative.'})
        if self.minimum_quantity is not None and self.minimum_quantity < 1:
            raise ValidationError({'minimum_quantity': 'Minimum quantity must be at least 1.'})
        if self.billing_frequency not in self.Frequency.values:
            raise ValidationError({'billing_frequency': f"Unsupported billing frequency '{self.billing_frequency}'. Allowed: {', '.join(self.Frequency.values)}"})
        if self.available_from and self.available_until and self.available_until < self.available_from:
            raise ValidationError({'available_until': 'available_until date must not precede available_from date.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.billing_frequency} - ₹{self.price})"
