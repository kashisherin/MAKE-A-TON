from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from customers.models import Customer
from products.models import Product, ProductVariant
from plans.models import Plan
from .models import Quotation, QuotationTemplate, QuotationTemplateLine, QuotationLine


class QuotationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='admin@quote.com', password='AdminPass!123')
        self.staff1 = User.objects.create_user(email='staff1@quote.com', password='StaffPass!123', role=User.Role.STAFF)
        self.staff2 = User.objects.create_user(email='staff2@quote.com', password='StaffPass!123', role=User.Role.STAFF)

        self.cust_user = User.objects.create_user(email='cust@quote.com', password='CustPass!123', role=User.Role.CUSTOMER)
        self.customer1 = Customer.objects.create(
            user=self.cust_user,
            email=self.cust_user.email,
            contact_person='Quotation Customer',
            company_name='QuoteCo',
            assigned_staff=self.staff1
        )

        self.cust_user2 = User.objects.create_user(email='cust2@quote.com', password='CustPass!123', role=User.Role.CUSTOMER)
        self.customer2 = Customer.objects.create(
            user=self.cust_user2,
            email=self.cust_user2.email,
            contact_person='Customer Two',
            company_name='OtherCo',
            assigned_staff=self.staff2
        )

        self.plan = Plan.objects.create(
            name='Pro Monthly',
            billing_frequency='MONTHLY',
            price=Decimal('1000.00'),
            minimum_quantity=1
        )
        self.plan2 = Plan.objects.create(
            name='Enterprise Yearly',
            billing_frequency='YEARLY',
            price=Decimal('10000.00'),
            minimum_quantity=1
        )
        self.product = Product.objects.create(
            name='Addon Module',
            product_type='SERVICE',
            sales_price=Decimal('500.00')
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            variant_name='Odoo Custom',
            brand='Odoo',
            price_adjustment=Decimal('560.00')
        )  # final_price = 500 + 560 = 1060.00

        self.other_product = Product.objects.create(
            name='Other Module',
            product_type='HARDWARE',
            sales_price=Decimal('300.00')
        )

    def test_template_creation_with_nested_lines(self):
        self.client.force_authenticate(user=self.staff1)
        response = self.client.post('/api/v1/quotations/templates/', {
            'name': 'Standard Onboarding Template',
            'validity_days': 20,
            'description': '20 day valid template',
            'lines': [
                {'plan': self.plan.id, 'quantity': 1},
                {'product': self.product.id, 'variant': self.variant.id, 'quantity': 2}
            ]
        }, format='json')
        self.assertEqual(response.status_code, 201)
        template = QuotationTemplate.objects.get(name='Standard Onboarding Template')
        self.assertEqual(template.lines.count(), 2)

    def test_template_line_management_endpoints(self):
        self.client.force_authenticate(user=self.staff1)
        template = QuotationTemplate.objects.create(name='Line Test Template', validity_days=15)

        # 1. Add line via /api/v1/quotations/template-lines/
        line_resp = self.client.post('/api/v1/quotations/template-lines/', {
            'template': template.id,
            'plan': self.plan.id,
            'quantity': 3
        }, format='json')
        self.assertEqual(line_resp.status_code, 201)
        line_id = line_resp.data['id']

        # 2. Update line
        patch_resp = self.client.patch(f'/api/v1/quotations/template-lines/{line_id}/', {
            'quantity': 5
        }, format='json')
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(QuotationTemplateLine.objects.get(pk=line_id).quantity, 5)

        # 3. Delete line
        del_resp = self.client.delete(f'/api/v1/quotations/template-lines/{line_id}/')
        self.assertEqual(del_resp.status_code, 204)
        self.assertFalse(QuotationTemplateLine.objects.filter(pk=line_id).exists())

    def test_quotation_validity_default_calculated_from_template(self):
        self.client.force_authenticate(user=self.staff1)
        template = QuotationTemplate.objects.create(name='30-Day Template', validity_days=30)

        # Create quotation WITHOUT specifying valid_until
        response = self.client.post('/api/v1/quotations/', {
            'customer': self.customer1.id,
            'template': template.id,
            'lines': [{'plan': self.plan.id, 'quantity': 1}]
        }, format='json')
        self.assertEqual(response.status_code, 201)
        quote = Quotation.objects.get(pk=response.data['id'])
        expected_date = date.today() + timedelta(days=30)
        self.assertEqual(quote.valid_until, expected_date)

    def test_staff_restricted_to_assigned_customer_quotations(self):
        # Staff 1 creates quote for Customer 1
        quote1 = Quotation.objects.create(
            number='QT-STAFF1-001',
            customer=self.customer1,
            created_by=self.staff1,
            valid_until=date.today() + timedelta(days=10),
            status=Quotation.Status.DRAFT
        )
        # Staff 2 creates quote for Customer 2
        quote2 = Quotation.objects.create(
            number='QT-STAFF2-002',
            customer=self.customer2,
            created_by=self.staff2,
            valid_until=date.today() + timedelta(days=10),
            status=Quotation.Status.DRAFT
        )

        # Staff 1 can only see quote 1, not quote 2
        self.client.force_authenticate(user=self.staff1)
        res = self.client.get('/api/v1/quotations/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], quote1.id)

        # Staff 1 accessing quote 2 returns 404
        res_detail = self.client.get(f'/api/v1/quotations/{quote2.id}/')
        self.assertEqual(res_detail.status_code, 404)

    def test_quotation_conversion_single_plan_enforcement(self):
        self.client.force_authenticate(user=self.staff1)
        # Create quote with TWO different plans -> must be rejected during conversion
        quote = Quotation.objects.create(
            number='QT-MULTI-PLAN',
            customer=self.customer1,
            created_by=self.staff1,
            valid_until=date.today() + timedelta(days=10),
            status=Quotation.Status.ACCEPTED
        )
        QuotationLine.objects.create(quotation=quote, plan=self.plan, quantity=1, unit_price=self.plan.price, line_total=self.plan.price)
        QuotationLine.objects.create(quotation=quote, plan=self.plan2, quantity=1, unit_price=self.plan2.price, line_total=self.plan2.price)

        resp = self.client.post(f'/api/v1/quotations/{quote.id}/convert-to-subscription/')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Multiple distinct plans', str(resp.data))

    def test_quotation_conversion_validates_variant_product_match(self):
        self.client.force_authenticate(user=self.staff1)
        quote = Quotation.objects.create(
            number='QT-MISMATCH-VAR',
            customer=self.customer1,
            created_by=self.staff1,
            valid_until=date.today() + timedelta(days=10),
            status=Quotation.Status.ACCEPTED
        )
        QuotationLine.objects.create(quotation=quote, plan=self.plan, quantity=1, unit_price=self.plan.price, line_total=self.plan.price)
        # Variant belongs to self.product, but line assigns self.other_product
        line = QuotationLine(
            quotation=quote,
            product=self.other_product,
            variant=self.variant,
            quantity=1,
            unit_price=self.variant.final_price,
            line_total=self.variant.final_price
        )
        # Should raise validation error on save / clean
        with self.assertRaises(Exception):
            line.clean()

    def test_accepted_quotation_converts_successfully(self):
        self.client.force_authenticate(user=self.staff1)
        quote = Quotation.objects.create(
            number='QT-CONVERT-OK',
            customer=self.customer1,
            created_by=self.staff1,
            valid_until=date.today() + timedelta(days=10),
            status=Quotation.Status.DRAFT,
            subtotal=Decimal('1000.00'),
            total=Decimal('1000.00')
        )
        QuotationLine.objects.create(
            quotation=quote,
            plan=self.plan,
            quantity=1,
            unit_price=Decimal('1000.00'),
            line_total=Decimal('1000.00')
        )
        QuotationLine.objects.create(
            quotation=quote,
            product=self.product,
            variant=self.variant,
            quantity=2,
            unit_price=self.variant.final_price,
            line_total=self.variant.final_price * 2
        )

        accept_resp = self.client.post(f'/api/v1/quotations/{quote.id}/accept/')
        self.assertEqual(accept_resp.status_code, 200)

        conv_resp = self.client.post(f'/api/v1/quotations/{quote.id}/convert-to-subscription/')
        self.assertEqual(conv_resp.status_code, 201)

        dup_resp = self.client.post(f'/api/v1/quotations/{quote.id}/convert-to-subscription/')
        self.assertEqual(dup_resp.status_code, 400)
