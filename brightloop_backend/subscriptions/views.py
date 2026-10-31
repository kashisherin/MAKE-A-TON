from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.permissions import IsAdminOrStaff, IsObjectOwnerOrAdminOrStaff
from customers.models import Customer
from plans.models import Plan
from .models import Subscription
from .serializers import SubscriptionSerializer, SubscriptionHistorySerializer
from .services import create_subscription, transition, renew


class SubscriptionViewSet(ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, IsObjectOwnerOrAdminOrStaff]
    http_method_names = ['get', 'post', 'head', 'options']
    filterset_fields = ['status', 'customer', 'plan', 'billing_frequency']
    search_fields = ['number', 'customer__company_name', 'customer__contact_person', 'customer__email']
    ordering_fields = ['created_at', 'start_date', 'expiry_date', 'status']

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Subscription.objects.none()
        qs = Subscription.objects.select_related('customer', 'plan', 'created_by').prefetch_related('lines', 'history')
        if user.role == 'ADMIN':
            return qs
        if user.role == 'STAFF':
            # Staff can see subscriptions only for assigned customers or unassigned customers
            return qs.filter(Q(customer__assigned_staff=user) | Q(customer__assigned_staff__isnull=True))
        # Customers can access only their own subscriptions
        return qs.filter(customer__user=user)

    def get_permissions(self):
        if self.action in ('create', 'confirm', 'activate', 'pause', 'resume', 'renew', 'close'):
            return [IsAdminOrStaff(), IsObjectOwnerOrAdminOrStaff()]
        return [IsAuthenticated(), IsObjectOwnerOrAdminOrStaff()]

    def create(self, request, *args, **kwargs):
        try:
            customer_id = request.data.get('customer')
            plan_id = request.data.get('plan')
            if not customer_id or not plan_id:
                raise ValidationError({'detail': 'Both customer and plan IDs are required.'})

            customer = Customer.objects.get(pk=customer_id)
            if request.user.role == 'STAFF' and customer.assigned_staff not in (request.user, None):
                raise PermissionDenied('Staff can only provision subscriptions for assigned or unassigned customers.')

            plan = Plan.objects.get(pk=plan_id)

            start_date_str = request.data.get('start_date')
            start_date = timezone.datetime.fromisoformat(start_date_str).date() if start_date_str else timezone.localdate()
            quantity = int(request.data.get('quantity', 1))
            payment_terms = request.data.get('payment_terms', '')

            subscription = create_subscription(
                customer=customer,
                plan=plan,
                user=request.user,
                start_date=start_date,
                quantity=quantity,
                payment_terms=payment_terms,
                lines=[]
            )
        except (Customer.DoesNotExist, Plan.DoesNotExist) as e:
            raise ValidationError({'detail': str(e)})
        except DjangoValidationError as e:
            raise ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)

        serializer = self.get_serializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _execute_transition(self, request, action_name):
        subscription = self.get_object()
        reason = request.data.get('reason', '')
        try:
            updated = transition(subscription.pk, request.user, action_name, reason=reason)
        except DjangoValidationError as e:
            raise ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)
        return Response(self.get_serializer(updated).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        return self._execute_transition(request, 'confirm')

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        return self._execute_transition(request, 'activate')

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        return self._execute_transition(request, 'pause')

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        return self._execute_transition(request, 'resume')

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        return self._execute_transition(request, 'close')

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        subscription = self.get_object()
        idempotency_key = request.data.get('idempotency_key', '').strip()
        if not idempotency_key:
            return Response({'idempotency_key': 'An idempotency_key is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated = renew(subscription.pk, request.user, idempotency_key=idempotency_key)
        except DjangoValidationError as e:
            raise ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)

        return Response(self.get_serializer(updated).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        subscription = self.get_object()
        serializer = SubscriptionHistorySerializer(subscription.history.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
