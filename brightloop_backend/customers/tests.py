from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from accounts.models import User
from .models import Customer


class CustomerManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='admin@corp.com', password='AdminPass!123')
        self.staff1 = User.objects.create_user(email='staff1@corp.com', password='StaffPass!123', role=User.Role.STAFF)
        self.staff2 = User.objects.create_user(email='staff2@corp.com', password='StaffPass!123', role=User.Role.STAFF)

        self.cust_user1 = User.objects.create_user(email='cust1@corp.com', password='CustPass!123', role=User.Role.CUSTOMER)
        self.customer1 = Customer.objects.create(
            user=self.cust_user1,
            email=self.cust_user1.email,
            contact_person='Alice Smith',
            company_name='Acme Corp',
            city='Mumbai',
            assigned_staff=self.staff1
        )

        self.cust_user2 = User.objects.create_user(email='cust2@corp.com', password='CustPass!123', role=User.Role.CUSTOMER)
        self.customer2 = Customer.objects.create(
            user=self.cust_user2,
            email=self.cust_user2.email,
            contact_person='Bob Jones',
            company_name='Globex',
            city='Delhi',
            assigned_staff=self.staff2
        )

    def test_admin_can_list_all_customers(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/customers/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)

    def test_staff_restricted_to_assigned_customers(self):
        # Staff 1 should only see Customer 1 (assigned to Staff 1), not Customer 2 (assigned to Staff 2)
        self.client.force_authenticate(user=self.staff1)
        response = self.client.get('/api/v1/customers/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.customer1.id)

        # Staff 1 attempting to access Customer 2 directly returns 404
        res2 = self.client.get(f'/api/v1/customers/{self.customer2.id}/')
        self.assertEqual(res2.status_code, 404)

    def test_customer_can_only_see_their_own_profile_in_list(self):
        self.client.force_authenticate(user=self.cust_user1)
        response = self.client.get('/api/v1/customers/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.customer1.id)

    def test_customer_cannot_access_other_customer_by_id(self):
        self.client.force_authenticate(user=self.cust_user1)
        response = self.client.get(f'/api/v1/customers/{self.customer2.id}/')
        self.assertEqual(response.status_code, 404)

    def test_customer_email_uniqueness_enforced(self):
        # Database / model uniqueness constraint
        with self.assertRaises((IntegrityError, ValidationError)):
            Customer.objects.create(
                email='cust1@corp.com',  # duplicate
                contact_person='Duplicate Person',
                company_name='Duplicate Co'
            )

    def test_customer_email_must_match_linked_user(self):
        # Mismatched email should raise ValidationError
        mismatched_user = User.objects.create_user(email='realuser@corp.com', password='Password!123')
        cust = Customer(
            user=mismatched_user,
            email='different@corp.com',
            contact_person='Test Person'
        )
        with self.assertRaises(ValidationError):
            cust.full_clean()

    def test_customer_can_update_their_own_contact_details(self):
        self.client.force_authenticate(user=self.cust_user1)
        response = self.client.patch(f'/api/v1/customers/{self.customer1.id}/', {
            'phone_number': '+91-9876543210',
            'city': 'Bengaluru'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.customer1.refresh_from_db()
        self.assertEqual(self.customer1.phone_number, '+91-9876543210')
        self.assertEqual(self.customer1.city, 'Bengaluru')

    def test_customer_cannot_deactivate_or_assign_staff(self):
        self.client.force_authenticate(user=self.cust_user1)
        response = self.client.patch(f'/api/v1/customers/{self.customer1.id}/', {
            'is_active': False,
            'assigned_staff': self.staff1.id
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_admin_can_deactivate_customer(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/customers/{self.customer2.id}/deactivate/')
        self.assertEqual(response.status_code, 200)
        self.customer2.refresh_from_db()
        self.assertFalse(self.customer2.is_active)
