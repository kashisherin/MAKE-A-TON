from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from django.db.models import Q

from accounts.permissions import IsAdminOrStaff, IsObjectOwnerOrAdminOrStaff
from .models import Customer
from .serializers import CustomerSerializer
from audit.services import record_audit


class CustomerViewSet(ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsObjectOwnerOrAdminOrStaff]
    search_fields = ['company_name', 'contact_person', 'email', 'phone_number', 'city']
    filterset_fields = ['is_active', 'city', 'state']
    ordering_fields = ['created_at', 'company_name', 'contact_person']

    def get_queryset(self):
        u = self.request.user
        if not u or not u.is_authenticated:
            return Customer.objects.none()
        if u.role == 'ADMIN':
            return Customer.objects.all()
        if u.role == 'STAFF':
            # Staff can only see assigned customers and unassigned operational customers
            return Customer.objects.filter(Q(assigned_staff=u) | Q(assigned_staff__isnull=True))
        # Customer sees only their own linked profile
        return Customer.objects.filter(user=u)

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsAdminOrStaff()]
        return [IsAuthenticated(), IsObjectOwnerOrAdminOrStaff()]

    def perform_create(self, serializer):
        obj = serializer.save()
        record_audit(
            self.request.user,
            'CUSTOMER_CREATED',
            obj,
            after={'email': obj.email, 'company_name': obj.company_name, 'contact_person': obj.contact_person}
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        before = {
            'company_name': instance.company_name,
            'contact_person': instance.contact_person,
            'email': instance.email,
            'phone_number': instance.phone_number,
            'address': instance.address,
            'is_active': instance.is_active,
        }
        obj = serializer.save()
        after = {
            'company_name': obj.company_name,
            'contact_person': obj.contact_person,
            'email': obj.email,
            'phone_number': obj.phone_number,
            'address': obj.address,
            'is_active': obj.is_active,
        }
        record_audit(self.request.user, 'CUSTOMER_UPDATED', obj, before=before, after=after)

    def perform_destroy(self, instance):
        before = {'is_active': instance.is_active}
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        record_audit(self.request.user, 'CUSTOMER_DEACTIVATED', instance, before=before, after={'is_active': False})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrStaff, IsObjectOwnerOrAdminOrStaff])
    def deactivate(self, request, pk=None):
        customer = self.get_object()
        before = {'is_active': customer.is_active}
        customer.is_active = False
        customer.save(update_fields=['is_active'])
        record_audit(request.user, 'CUSTOMER_DEACTIVATED', customer, before=before, after={'is_active': False})
        return Response({'id': customer.pk, 'is_active': False, 'detail': 'Customer deactivated successfully.'}, status=status.HTTP_200_OK)
