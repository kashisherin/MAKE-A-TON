from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from accounts.models import User
from .models import Plan


class PlanTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='admin@plan.com', password='AdminPass!123')
        self.staff = User.objects.create_user(email='staff@plan.com', password='StaffPass!123', role=User.Role.STAFF)
        self.customer = User.objects.create_user(email='cust@plan.com', password='CustPass!123', role=User.Role.CUSTOMER)

    def test_valid_billing_frequencies_accepted(self):
        for freq in ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']:
            plan = Plan(name=f'{freq} Plan', billing_frequency=freq, price=Decimal('99.00'), minimum_quantity=1)
            plan.full_clean()
            plan.save()
            self.assertEqual(plan.billing_frequency, freq)

    def test_invalid_frequency_rejected(self):
        plan = Plan(name='Hourly Plan', billing_frequency='HOURLY', price=Decimal('99.00'))
        with self.assertRaises(ValidationError):
            plan.full_clean()

    def test_minimum_quantity_enforced(self):
        plan = Plan(name='Zero Qty Plan', billing_frequency='MONTHLY', price=Decimal('99.00'), minimum_quantity=0)
        with self.assertRaises(ValidationError):
            plan.full_clean()

    def test_invalid_availability_dates_rejected(self):
        # available_until before available_from must be rejected
        today = date.today()
        plan = Plan(
            name='Date Error Plan',
            billing_frequency='MONTHLY',
            price=Decimal('100.00'),
            available_from=today,
            available_until=today - timedelta(days=5)
        )
        with self.assertRaises(ValidationError):
            plan.full_clean()

    def test_admin_can_create_plan(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/plans/', {
            'name': 'Enterprise Yearly',
            'billing_frequency': 'YEARLY',
            'price': '12000.00',
            'minimum_quantity': 5,
            'pause_allowed': True,
            'renewal_allowed': True
        }, format='json')
        self.assertEqual(response.status_code, 201)

    def test_staff_and_customer_cannot_create_or_modify_plans(self):
        # Staff cannot create plan
        self.client.force_authenticate(user=self.staff)
        res_staff = self.client.post('/api/v1/plans/', {
            'name': 'Staff Plan',
            'billing_frequency': 'MONTHLY',
            'price': '500.00'
        }, format='json')
        self.assertEqual(res_staff.status_code, 403)

        # Customer cannot create plan
        self.client.force_authenticate(user=self.customer)
        res_cust = self.client.post('/api/v1/plans/', {
            'name': 'Cust Plan',
            'billing_frequency': 'MONTHLY',
            'price': '10.00'
        }, format='json')
        self.assertEqual(res_cust.status_code, 403)
