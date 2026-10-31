from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from accounts.models import User
from .models import Product, ProductVariant


class ProductAndVariantTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='admin@prod.com', password='AdminPass!123')
        self.staff = User.objects.create_user(email='staff@prod.com', password='StaffPass!123', role=User.Role.STAFF)
        self.customer = User.objects.create_user(email='cust@prod.com', password='CustPass!123', role=User.Role.CUSTOMER)
        self.product = Product.objects.create(
            name='BrightERP Core',
            product_type='SOFTWARE',
            sales_price=Decimal('2000.00'),
            cost_price=Decimal('800.00'),
            description='Enterprise resource planning'
        )

    def test_product_creation(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/products/', {
            'name': 'CRM Suite',
            'product_type': 'SOFTWARE',
            'sales_price': '1500.00',
            'cost_price': '600.00'
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Product.objects.filter(name='CRM Suite').count(), 1)

    def test_negative_price_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/products/', {
            'name': 'Invalid Product',
            'product_type': 'SOFTWARE',
            'sales_price': '-500.00',
            'cost_price': '100.00'
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_variant_creation_and_final_price_calculation(self):
        variant = ProductVariant.objects.create(
            product=self.product,
            variant_name='Pro Edition',
            brand='Standard',
            price_adjustment=Decimal('350.00')
        )
        # Base 2000 + Adjustment 350 = 2350
        self.assertEqual(variant.final_price, Decimal('2350.00'))

    def test_odoo_variant_adds_exactly_560(self):
        # Base price = 2000, Odoo adjustment = 560 -> Final price = 2560
        variant = ProductVariant(
            product=self.product,
            variant_name='Odoo Cloud Edition',
            brand='Odoo',
            price_adjustment=Decimal('560.00')
        )
        variant.full_clean()
        variant.save()
        self.assertEqual(variant.final_price, Decimal('2560.00'))

    def test_incorrect_odoo_price_adjustment_rejected(self):
        # Odoo variant must add exactly 560; 500 or 600 must be rejected
        variant = ProductVariant(
            product=self.product,
            variant_name='Odoo Invalid Edition',
            brand='Odoo',
            price_adjustment=Decimal('500.00')
        )
        with self.assertRaises(ValidationError):
            variant.full_clean()

    def test_negative_price_adjustment_rejected(self):
        variant = ProductVariant(
            product=self.product,
            variant_name='Negative Variant',
            brand='Standard',
            price_adjustment=Decimal('-100.00')
        )
        with self.assertRaises(ValidationError):
            variant.full_clean()

    def test_customer_cannot_modify_products_or_prices(self):
        self.client.force_authenticate(user=self.customer)
        # Customer trying to change product price
        response = self.client.patch(f'/api/v1/products/{self.product.id}/', {
            'sales_price': '1.00'
        }, format='json')
        self.assertEqual(response.status_code, 403)

        # Customer trying to create variant
        resp_var = self.client.post(f'/api/v1/products/{self.product.id}/variants/', {
            'variant_name': 'Hacked Variant',
            'brand': 'Custom',
            'price_adjustment': '0.00'
        }, format='json')
        self.assertEqual(resp_var.status_code, 403)
