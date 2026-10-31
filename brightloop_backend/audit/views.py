from rest_framework.generics import ListAPIView
from rest_framework import serializers
from accounts.permissions import IsAdmin
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            'id', 'user', 'user_email', 'user_role', 'action', 'entity_type',
            'entity_id', 'timestamp', 'before_values', 'after_values', 'metadata'
        )


class AuditListView(ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    queryset = AuditLog.objects.select_related('user').all()
    search_fields = ['action', 'entity_type', 'entity_id', 'user__email']
    filterset_fields = ['action', 'entity_type', 'user_role']
    ordering_fields = ['timestamp', 'action', 'entity_type']
