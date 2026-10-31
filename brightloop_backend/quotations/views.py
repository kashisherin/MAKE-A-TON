from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.permissions import IsAdminOrStaff, IsObjectOwnerOrAdminOrStaff
from .models import Quotation, QuotationTemplate, QuotationTemplateLine
from .serializers import (
    QuotationSerializer,
    QuotationTemplateSerializer,
    QuotationTemplateLineSerializer
)
from audit.services import record_audit


class QuotationViewSet(ModelViewSet):
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated, IsObjectOwnerOrAdminOrStaff]
    search_fields = ['number', 'customer__company_name', 'customer__contact_person', 'customer__email']
    filterset_fields = ['status', 'customer']
    ordering_fields = ['created_at', 'valid_until', 'total']

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Quotation.objects.none()
        qs = Quotation.objects.select_related('customer', 'template', 'created_by').prefetch_related('lines')
        if user.role == 'ADMIN':
            return qs
        if user.role == 'STAFF':
            # Staff only see quotations for assigned customers or unassigned operational customers
            return qs.filter(Q(customer__assigned_staff=user) | Q(customer__assigned_staff__isnull=True))
        # Customers see only their own quotations
        return qs.filter(customer__user=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'accept', 'convert_to_subscription'):
            return [IsAdminOrStaff(), IsObjectOwnerOrAdminOrStaff()]
        return [IsAuthenticated(), IsObjectOwnerOrAdminOrStaff()]

    def perform_create(self, serializer):
        user = self.request.user
        customer = serializer.validated_data.get('customer')
        if user.role == 'STAFF' and customer.assigned_staff not in (user, None):
            raise PermissionDenied('Staff can only generate quotations for assigned or unassigned customers.')
        quotation = serializer.save()
        record_audit(
            user,
            'QUOTATION_CREATED',
            quotation,
            after={'number': quotation.number, 'customer_id': quotation.customer_id, 'total': str(quotation.total)}
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        before = {'status': instance.status, 'total': str(instance.total)}
        quotation = serializer.save()
        after = {'status': quotation.status, 'total': str(quotation.total)}
        record_audit(self.request.user, 'QUOTATION_UPDATED', quotation, before=before, after=after)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        quotation = self.get_object()
        today = timezone.localdate()
        if quotation.valid_until < today:
            quotation.status = Quotation.Status.EXPIRED
            quotation.save(update_fields=['status'])
            raise ValidationError('Quotation has expired and cannot be accepted.')

        if quotation.status not in (Quotation.Status.DRAFT, Quotation.Status.SENT):
            raise ValidationError(f"Quotation cannot be accepted from current status '{quotation.status}'.")

        old_status = quotation.status
        quotation.status = Quotation.Status.ACCEPTED
        quotation.save(update_fields=['status'])
        record_audit(
            request.user,
            'QUOTATION_ACCEPTED',
            quotation,
            before={'status': old_status},
            after={'status': quotation.status}
        )
        return Response(self.get_serializer(quotation).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='convert-to-subscription')
    def convert_to_subscription(self, request, pk=None):
        from subscriptions.services import create_subscription
        from subscriptions.models import SubscriptionLine

        with transaction.atomic():
            quotation = Quotation.objects.select_for_update().get(pk=pk)

            # Prevent duplicate or invalid conversion
            if quotation.status != Quotation.Status.ACCEPTED:
                raise ValidationError('Quotation must be in ACCEPTED status to be converted into a subscription.')

            if quotation.converted or hasattr(quotation, 'subscription'):
                raise ValidationError('This quotation has already been converted into a subscription.')

            # Plan enforcement: Quotation must specify exactly one plan
            plan_lines = quotation.lines.filter(plan__isnull=False)
            if not plan_lines.exists():
                raise ValidationError('Quotation must have at least one line referencing a valid subscription plan.')

            distinct_plans = set(plan_lines.values_list('plan_id', flat=True))
            if len(distinct_plans) > 1:
                raise ValidationError('A subscription can only have one plan. Multiple distinct plans found in quotation lines.')

            plan_line = plan_lines.first()
            selected_plan = plan_line.plan

            if not selected_plan.is_active:
                raise ValidationError('The plan referenced by this quotation is no longer active.')

            today = timezone.localdate()
            if selected_plan.available_from and today < selected_plan.available_from:
                raise ValidationError(f"The plan is not available until {selected_plan.available_from}.")
            if selected_plan.available_until and today > selected_plan.available_until:
                raise ValidationError(f"The plan availability expired on {selected_plan.available_until}.")

            total_plan_qty = sum(l.quantity for l in plan_lines)
            if total_plan_qty < selected_plan.minimum_quantity:
                raise ValidationError(f"Quotation plan quantity ({total_plan_qty}) is below the minimum required quantity ({selected_plan.minimum_quantity}).")

            # Validate all product and variant lines
            for line in quotation.lines.filter(product__isnull=False):
                if not line.product.is_active:
                    raise ValidationError(f"Product '{line.product.name}' is inactive and cannot be converted.")
                if line.variant:
                    if not line.variant.is_active:
                        raise ValidationError(f"Variant '{line.variant.variant_name}' is inactive.")
                    if line.variant.product_id != line.product_id:
                        raise ValidationError(f"Variant '{line.variant.variant_name}' does not belong to product '{line.product.name}'.")

            subscription = create_subscription(
                customer=quotation.customer,
                plan=selected_plan,
                user=request.user,
                start_date=today,
                quantity=total_plan_qty,
                quotation=quotation,
                lines=[]
            )

            # Add product lines to subscription
            for line in quotation.lines.filter(product__isnull=False):
                SubscriptionLine.objects.create(
                    subscription=subscription,
                    product=line.product,
                    variant=line.variant,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    line_total=line.line_total
                )

            quotation.converted = True
            quotation.save(update_fields=['converted'])

            record_audit(
                request.user,
                'QUOTATION_CONVERTED',
                quotation,
                after={'subscription_id': subscription.id, 'subscription_number': subscription.number}
            )

        return Response({
            'detail': 'Quotation converted successfully into subscription.',
            'subscription_id': subscription.id,
            'subscription_number': subscription.number
        }, status=status.HTTP_201_CREATED)


class QuotationTemplateViewSet(ModelViewSet):
    queryset = QuotationTemplate.objects.all().prefetch_related('lines')
    serializer_class = QuotationTemplateSerializer
    permission_classes = [IsAdminOrStaff]
    search_fields = ['name', 'description']
    filterset_fields = ['is_active']


class QuotationTemplateLineViewSet(ModelViewSet):
    queryset = QuotationTemplateLine.objects.all().select_related('template', 'product', 'variant', 'plan')
    serializer_class = QuotationTemplateLineSerializer
    permission_classes = [IsAdminOrStaff]
    filterset_fields = ['template', 'product', 'plan']
