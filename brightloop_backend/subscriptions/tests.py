from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.core.management import call_command
from rest_framework.test import APIClient

from accounts.models import User
from customers.models import Customer
from plans.models import Plan
from products.models import Product
from .models import Subscription, SubscriptionHistory, RenewalRecord
from .services import create_subscription, transition, renew


class SubscriptionLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='admin@sub.com', password='AdminPass!123')
        self.staff1 = User.objects.create_user(email='staff1@sub.com', password='StaffPass!123', role=User.Role.STAFF)
        self.staff2 = User.objects.create_user(email='staff2@sub.com', password='StaffPass!123', role=User.Role.STAFF)

        self.cust_user1 = User.objects.create_user(email='cust1@sub.com', password='CustPass!123', role=User.Role.CUSTOMER)
        self.customer1 = Customer.objects.create(
            user=self.cust_user1,
            email=self.cust_user1.email,
            contact_person='Customer One',
            company_name='SubCo1',
            assigned_staff=self.staff1
        )

        self.cust_user2 = User.objects.create_user(email='cust2@sub.com', password='CustPass!123', role=User.Role.CUSTOMER)
        self.customer2 = Customer.objects.create(
            user=self.cust_user2,
            email=self.cust_user2.email,
            contact_person='Customer Two',
            company_name='SubCo2',
            assigned_staff=self.staff2
        )

        self.plan_flexible = Plan.objects.create(
            name='Flexible Monthly',
            billing_frequency='MONTHLY',
            price=Decimal('1500.00'),
            minimum_quantity=1,
            pause_allowed=True,
            renewal_allowed=True,
            early_closure_allowed=True,
            auto_close_enabled=True
        )

        self.plan_strict = Plan.objects.create(
            name='Strict Monthly',
            billing_frequency='MONTHLY',
            price=Decimal('1500.00'),
            minimum_quantity=2,
            pause_allowed=True,  # pause allowed, but early closure NOT allowed
            renewal_allowed=False,
            early_closure_allowed=False,
            auto_close_enabled=True
        )

    def test_unique_subscription_number_and_creation(self):
        sub1 = create_subscription(customer=self.customer1, plan=self.plan_flexible, user=self.staff1, quantity=1)
        sub2 = create_subscription(customer=self.customer1, plan=self.plan_flexible, user=self.staff1, quantity=1)
        self.assertNotEqual(sub1.number, sub2.number)
        self.assertTrue(sub1.number.startswith('BL-'))
        self.assertEqual(sub1.status, Subscription.Status.DRAFT)

    def test_minimum_quantity_enforced(self):
        # Strict plan requires min quantity 2
        with self.assertRaises(ValidationError):
            create_subscription(customer=self.customer1, plan=self.plan_strict, user=self.staff1, quantity=1)

    def test_correct_lifecycle_flow(self):
        sub = create_subscription(customer=self.customer1, plan=self.plan_flexible, user=self.staff1, quantity=1)

        # 1. Confirm
        transition(sub.pk, self.staff1, 'confirm')
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.CONFIRMED)

        # 2. Activate
        transition(sub.pk, self.staff1, 'activate')
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertIsNotNone(sub.activated_at)

        # 3. Pause
        transition(sub.pk, self.staff1, 'pause')
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.PAUSED)
        self.assertIsNotNone(sub.pause_date)

        # 4. Resume
        transition(sub.pk, self.staff1, 'resume')
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertIsNone(sub.pause_date)

        # 5. Close
        transition(sub.pk, self.staff1, 'close', reason='Customer requested cancellation')
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.CLOSED)
        self.assertEqual(sub.closure_reason, 'Customer requested cancellation')

    def test_early_closure_enforced_on_active_subscription(self):
        # Strict plan has early_closure_allowed = False
        sub = create_subscription(customer=self.customer1, plan=self.plan_strict, user=self.staff1, quantity=2)
        transition(sub.pk, self.staff1, 'confirm')
        transition(sub.pk, self.staff1, 'activate')

        # Early closure when today < expiry_date must fail
        with self.assertRaises(ValidationError):
            transition(sub.pk, self.staff1, 'close')

    def test_early_closure_enforced_on_paused_subscription(self):
        # Paused subscription must NOT be able to bypass the early closure restriction!
        sub = create_subscription(customer=self.customer1, plan=self.plan_strict, user=self.staff1, quantity=2)
        transition(sub.pk, self.staff1, 'confirm')
        transition(sub.pk, self.staff1, 'activate')
        transition(sub.pk, self.staff1, 'pause')
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.PAUSED)

        # Attempting early closure while PAUSED when early_closure_allowed = False must be rejected!
        with self.assertRaises(ValidationError):
            transition(sub.pk, self.staff1, 'close')

    def test_staff_restricted_to_assigned_customer_subscriptions(self):
        # Sub 1 belongs to Customer 1 (assigned to Staff 1)
        sub1 = create_subscription(customer=self.customer1, plan=self.plan_flexible, user=self.staff1, quantity=1)
        # Sub 2 belongs to Customer 2 (assigned to Staff 2)
        sub2 = create_subscription(customer=self.customer2, plan=self.plan_flexible, user=self.staff2, quantity=1)

        # Staff 1 should only see Sub 1 in list
        self.client.force_authenticate(user=self.staff1)
        res = self.client.get('/api/v1/subscriptions/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], sub1.id)

        # Staff 1 accessing Sub 2 directly returns 404
        res2 = self.client.get(f'/api/v1/subscriptions/{sub2.id}/')
        self.assertEqual(res2.status_code, 404)

    def test_closed_subscription_cannot_be_casually_reactivated(self):
        sub = create_subscription(customer=self.customer1, plan=self.plan_flexible, user=self.staff1, quantity=1)
        transition(sub.pk, self.staff1, 'confirm')
        transition(sub.pk, self.staff1, 'activate')
        transition(sub.pk, self.staff1, 'close')

        with self.assertRaises(ValidationError):
            transition(sub.pk, self.staff1, 'activate')
        with self.assertRaises(ValidationError):
            transition(sub.pk, self.staff1, 'confirm')

    def test_renewal_and_duplicate_renewal_prevention(self):
        sub = create_subscription(customer=self.customer1, plan=self.plan_flexible, user=self.staff1, quantity=1)
        transition(sub.pk, self.staff1, 'confirm')
        transition(sub.pk, self.staff1, 'activate')

        initial_expiry = sub.expiry_date
        idempotency_key = 'renewal-test-key-001'

        renewed_sub = renew(sub.pk, self.staff1, idempotency_key=idempotency_key)
        self.assertGreater(renewed_sub.expiry_date, initial_expiry)
        self.assertEqual(RenewalRecord.objects.filter(idempotency_key=idempotency_key).count(), 1)

        with self.assertRaises(ValidationError):
            renew(sub.pk, self.staff1, idempotency_key=idempotency_key)

    def test_automatic_expiry_management_command(self):
        past_date = date.today() - timedelta(days=5)
        sub = Subscription.objects.create(
            number='BL-PAST-001',
            customer=self.customer1,
            plan=self.plan_flexible,
            start_date=past_date - timedelta(days=30),
            expiry_date=past_date,
            billing_frequency='MONTHLY',
            status=Subscription.Status.ACTIVE,
            created_by=self.staff1
        )

        call_command('expire_subscriptions')

        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.CLOSED)
        self.assertEqual(sub.closure_reason, 'Automatic expiry')
