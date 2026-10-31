from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError('AuditLog records are immutable and cannot be updated.')

    def delete(self):
        raise ValidationError('AuditLog records are append-only and cannot be deleted.')


class AuditLogManager(models.Manager.from_queryset(AuditLogQuerySet)):
    pass


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_logs')
    user_role = models.CharField(max_length=20, blank=True)
    action = models.CharField(max_length=80)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80)
    timestamp = models.DateTimeField(auto_now_add=True)
    before_values = models.JSONField(default=dict, blank=True)
    after_values = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    objects = AuditLogManager()

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['user_role']),
        ]

    def save(self, *args, **kwargs):
        if self.pk and not kwargs.get('force_insert', False):
            raise ValidationError('AuditLog records are immutable and cannot be updated.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('AuditLog records are append-only and cannot be deleted.')

    def __str__(self):
        user_str = self.user.email if self.user else f"System ({self.user_role})"
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {user_str} - {self.action} on {self.entity_type} #{self.entity_id}"
