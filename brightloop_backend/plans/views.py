from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from .models import Plan
from .serializers import PlanSerializer
from audit.services import record_audit


class PlanViewSet(ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['billing_frequency', 'is_active', 'auto_close_enabled', 'pause_allowed', 'renewal_allowed']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'created_at']

    def get_permissions(self):
        # Only ADMIN users can create, update, or delete plans
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        plan = serializer.save()
        record_audit(
            self.request.user,
            'PLAN_CREATED',
            plan,
            after={
                'name': plan.name,
                'billing_frequency': plan.billing_frequency,
                'price': str(plan.price),
                'minimum_quantity': plan.minimum_quantity
            }
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        before = {
            'name': instance.name,
            'billing_frequency': instance.billing_frequency,
            'price': str(instance.price),
            'minimum_quantity': instance.minimum_quantity,
            'is_active': instance.is_active,
        }
        plan = serializer.save()
        after = {
            'name': plan.name,
            'billing_frequency': plan.billing_frequency,
            'price': str(plan.price),
            'minimum_quantity': plan.minimum_quantity,
            'is_active': plan.is_active,
        }
        record_audit(self.request.user, 'PLAN_UPDATED', plan, before=before, after=after)

    def perform_destroy(self, instance):
        before = {'is_active': instance.is_active}
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        record_audit(self.request.user, 'PLAN_DEACTIVATED', instance, before=before, after={'is_active': False})
