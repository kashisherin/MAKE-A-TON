from django.test import TestCase
from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from .models import User
from customers.models import Customer


class AuthenticationAndPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='AdminPass!123',
            role=User.Role.ADMIN
        )
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='StaffPass!123',
            role=User.Role.STAFF
        )
        self.customer_user = User.objects.create_user(
            email='customer1@example.com',
            password='CustomerPass!123',
            role=User.Role.CUSTOMER
        )
        self.customer_profile1 = Customer.objects.create(
            user=self.customer_user,
            email=self.customer_user.email,
            contact_person='Customer One',
            company_name='Alpha Corp'
        )

        self.customer_user2 = User.objects.create_user(
            email='customer2@example.com',
            password='CustomerPass!123',
            role=User.Role.CUSTOMER
        )
        self.customer_profile2 = Customer.objects.create(
            user=self.customer_user2,
            email=self.customer_user2.email,
            contact_person='Customer Two',
            company_name='Beta Corp'
        )

    # 1. Authentication Tests
    def test_valid_registration(self):
        payload = {
            'email': 'newcustomer@example.com',
            'password': 'StrongPass!2026',
            'first_name': 'New',
            'last_name': 'User',
            'company_name': 'NewCo'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['email'], 'newcustomer@example.com')
        self.assertEqual(response.data['role'], 'CUSTOMER')

        # Verify password is encrypted and not stored in plaintext
        user = User.objects.get(email='newcustomer@example.com')
        self.assertFalse(user.password == 'StrongPass!2026')
        self.assertTrue(user.check_password('StrongPass!2026'))

        # Verify customer profile was automatically created
        profile = Customer.objects.filter(user=user).first()
        self.assertIsNotNone(profile)
        self.assertEqual(profile.company_name, 'NewCo')

    def test_duplicate_email_rejected(self):
        payload = {
            'email': 'customer1@example.com',
            'password': 'StrongPass!2026'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_invalid_email_rejected(self):
        payload = {
            'email': 'not-a-valid-email',
            'password': 'StrongPass!2026'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_password_of_8_chars_rejected(self):
        payload = {
            'email': 'test8chars@example.com',
            'password': 'Abc!1234'  # exactly 8 chars -> must be rejected (> 8 chars required)
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_password_without_uppercase_rejected(self):
        payload = {
            'email': 'testnoupper@example.com',
            'password': 'strongpass!2026'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_password_without_lowercase_rejected(self):
        payload = {
            'email': 'testnolower@example.com',
            'password': 'STRONGPASS!2026'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_password_without_special_char_rejected(self):
        payload = {
            'email': 'testnospecial@example.com',
            'password': 'StrongPass2026'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_successful_login(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'customer1@example.com',
            'password': 'CustomerPass!123'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'CUSTOMER')

    def test_invalid_login(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'customer1@example.com',
            'password': 'WrongPassword!123'
        }, format='json')
        self.assertEqual(response.status_code, 401)

    def test_password_reset_flow(self):
        # 1. Request reset link
        req_resp = self.client.post('/api/v1/auth/password-reset/', {
            'email': 'customer1@example.com'
        }, format='json')
        self.assertEqual(req_resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        # 2. Confirm with valid token
        uid = urlsafe_base64_encode(force_bytes(self.customer_user.pk))
        token = default_token_generator.make_token(self.customer_user)
        conf_resp = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'password': 'BrandNewPass!999'
        }, format='json')
        self.assertEqual(conf_resp.status_code, 200)

        # 3. Verify user can log in with new password
        login_resp = self.client.post('/api/v1/auth/login/', {
            'email': 'customer1@example.com',
            'password': 'BrandNewPass!999'
        }, format='json')
        self.assertEqual(login_resp.status_code, 200)

        # 4. Verify old token cannot be reused
        reuse_resp = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'password': 'AnotherPass!999'
        }, format='json')
        self.assertEqual(reuse_resp.status_code, 400)

    # 2. Role and Permission Tests
    def test_admin_can_create_staff(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/v1/auth/users/', {
            'email': 'newstaff@example.com',
            'password': 'StaffPass!2026',
            'first_name': 'New',
            'last_name': 'Staff',
            'role': 'STAFF'
        }, format='json')
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='newstaff@example.com')
        self.assertEqual(user.role, 'STAFF')

    def test_staff_cannot_create_staff(self):
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.post('/api/v1/auth/users/', {
            'email': 'roguestaff@example.com',
            'password': 'StaffPass!2026',
            'role': 'STAFF'
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_customer_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.customer_user)
        # Cannot access user management
        resp1 = self.client.get('/api/v1/auth/users/')
        self.assertEqual(resp1.status_code, 403)
        # Cannot access audit list
        resp2 = self.client.get('/api/v1/audit/')
        self.assertEqual(resp2.status_code, 403)

    def test_customer_cannot_retrieve_another_customers_data(self):
        self.client.force_authenticate(user=self.customer_user)
        # Customer 1 attempts to access Customer 2's profile
        response = self.client.get(f'/api/v1/customers/{self.customer_profile2.id}/')
        # get_queryset isolates customer 1, so customer 2's id is not found
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_users_are_rejected(self):
        response = self.client.get('/api/v1/customers/')
        self.assertEqual(response.status_code, 401)
