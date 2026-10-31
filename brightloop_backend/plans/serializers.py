from decimal import Decimal
from rest_framework import serializers
from .models import Plan


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            'id', 'name', 'description', 'billing_frequency', 'price',
            'minimum_quantity', 'available_from', 'available_until',
            'auto_close_enabled', 'early_closure_allowed', 'pause_allowed',
            'renewal_allowed', 'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_price(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError('Price cannot be negative.')
        return value

    def validate_minimum_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Minimum quantity must be at least 1.')
        return value

    def validate_billing_frequency(self, value):
        if value not in Plan.Frequency.values:
            raise serializers.ValidationError(f"Invalid frequency '{value}'. Allowed: {', '.join(Plan.Frequency.values)}")
        return value

    def validate(self, attrs):
        start = attrs.get('available_from', getattr(self.instance, 'available_from', None))
        end = attrs.get('available_until', getattr(self.instance, 'available_until', None))
        if start and end and end < start:
            raise serializers.ValidationError({'available_until': 'available_until must not precede available_from.'})
        return attrs
