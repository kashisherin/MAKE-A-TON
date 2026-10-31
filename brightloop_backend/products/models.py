from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=180)
    product_type = models.CharField(max_length=100)
    sales_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['product_type']),
            models.Index(fields=['is_active']),
        ]

    def clean(self):
        if self.sales_price is not None and self.sales_price < Decimal('0.00'):
            raise ValidationError({'sales_price': 'Sales price cannot be negative.'})
        if self.cost_price is not None and self.cost_price < Decimal('0.00'):
            raise ValidationError({'cost_price': 'Cost price cannot be negative.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (₹{self.sales_price})"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='variants')
    variant_name = models.CharField(max_length=120)
    brand = models.CharField(max_length=100, blank=True)
    price_adjustment = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['variant_name']
        indexes = [
            models.Index(fields=['brand']),
            models.Index(fields=['is_active']),
        ]

    @property
    def final_price(self):
        base = self.product.sales_price if self.product_id else Decimal('0.00')
        return base + (self.price_adjustment or Decimal('0.00'))

    def clean(self):
        if self.price_adjustment is not None and self.price_adjustment < Decimal('0.00'):
            raise ValidationError({'price_adjustment': 'Price adjustment cannot be negative.'})
        if self.brand and self.brand.strip().lower() == 'odoo':
            if self.price_adjustment != Decimal('560.00'):
                raise ValidationError({'price_adjustment': 'The specified Odoo brand variant must add exactly ₹560.00 to the base price.'})
        if self.product_id and self.final_price < Decimal('0.00'):
            raise ValidationError({'final_price': 'Final price cannot be negative.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} - {self.variant_name} ({self.brand or 'Standard'}) [₹{self.final_price}]"
