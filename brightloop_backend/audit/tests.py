from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from accounts.models import User
from customers.models import Customer
from products.models import Product
from audit.models import AuditLog
from audit.services import record_audit


class AuditLoggingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='admin@audit.com', password='AdminPass!123')
        self.staff = User.objects.create_user(email='staff@audit.com', password='StaffPass!123', role=User.Role.STAFF)
        self.customer = User.objects.create_user(email='cust@audit.com', password='CustPass!123', role=User.Role.CUSTOMER)

    def test_record_audit_captures_before_and_after_values(self):
        product = Product.objects.create(
            name='Audit Product',
            product_type='SERVICE',
            sales_price=Decimal('100.00')
        )
        before = {'sales_price': '100.00'}
        after = {'sales_price': '150.00'}

        entry = record_audit(
            user=self.admin,
            action='PRICE_CHANGED',
            entity=product,
            before=before,
            after=after,
            metadata={'reason': 'Annual indexation'}
        )

        self.assertIsNotNone(entry.id)
        self.assertEqual(entry.user_role, 'ADMIN')
        self.assertEqual(entry.action, 'PRICE_CHANGED')
        self.assertEqual(entry.entity_type, 'Product')
        self.assertEqual(entry.before_values['sales_price'], '100.00')
        self.assertEqual(entry.after_values['sales_price'], '150.00')
        self.assertEqual(entry.metadata['reason'], 'Annual indexation')

    def test_model_level_immutability_prevents_updates(self):
        product = Product.objects.create(name='Gadget', product_type='HARDWARE', sales_price=Decimal('50.00'))
        entry = record_audit(self.admin, 'PRODUCT_CREATED', product, after={'name': 'Gadget'})

        # 1. Modifying instance and calling save() must raise ValidationError
        entry.action = 'TAMPERED_ACTION'
        with self.assertRaises(ValidationError):
            entry.save()

        # 2. Bulk update via QuerySet must raise ValidationError
        with self.assertRaises(ValidationError):
            AuditLog.objects.filter(pk=entry.pk).update(action='TAMPERED_BULK')

    def test_model_level_immutability_prevents_deletion(self):
        product = Product.objects.create(name='Widget', product_type='HARDWARE', sales_price=Decimal('50.00'))
        entry = record_audit(self.admin, 'PRODUCT_CREATED', product, after={'name': 'Widget'})

        # 1. Calling delete() on instance must raise ValidationError
        with self.assertRaises(ValidationError):
            entry.delete()

        # 2. Bulk delete via QuerySet must raise ValidationError
        with self.assertRaises(ValidationError):
            AuditLog.objects.filter(pk=entry.pk).delete()

    def test_admin_can_view_and_search_audit_history(self):
        product = Product.objects.create(name='Widget2', product_type='HARDWARE', sales_price=Decimal('50.00'))
        record_audit(self.admin, 'PRODUCT_CREATED', product, after={'name': 'Widget2'})

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/audit/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_staff_and_customer_cannot_view_audit_history(self):
        self.client.force_authenticate(user=self.staff)
        res_staff = self.client.get('/api/v1/audit/')
        self.assertEqual(res_staff.status_code, 403)

        self.client.force_authenticate(user=self.customer)
        res_cust = self.client.get('/api/v1/audit/')
        self.assertEqual(res_cust.status_code, 403)

    def test_audit_records_cannot_be_modified_or_deleted_via_api(self):
        product = Product.objects.create(name='Gadget2', product_type='HARDWARE', sales_price=Decimal('50.00'))
        entry = record_audit(self.admin, 'PRODUCT_CREATED', product, after={'name': 'Gadget2'})

        self.client.force_authenticate(user=self.admin)
        # Attempt POST to audit (not allowed, ListAPIView only)
        res_post = self.client.post('/api/v1/audit/', {'action': 'HACK'}, format='json')
        self.assertEqual(res_post.status_code, 405)

        # Attempt DELETE to audit
        res_del = self.client.delete(f'/api/v1/audit/{entry.id}/')
        self.assertEqual(res_del.status_code, 404)
