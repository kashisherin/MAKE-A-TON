from rest_framework import serializers
from .models import Subscription, SubscriptionLine, SubscriptionHistory, RenewalRecord
from customers.serializers import CustomerSerializer
from plans.serializers import PlanSerializer
from products.serializers import ProductSerializer, VariantSerializer


class SubscriptionLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionLine
        fields = ('id', 'subscription', 'product', 'variant', 'quantity', 'unit_price', 'line_total', 'tax_reference')
        read_only_fields = ('id', 'line_total')


class SubscriptionHistorySerializer(serializers.ModelSerializer):
    performed_by_email = serializers.EmailField(source='performed_by.email', read_only=True)

    class Meta:
        model = SubscriptionHistory
        fields = ('id', 'subscription', 'from_status', 'to_status', 'action', 'performed_by', 'performed_by_email', 'performed_at', 'details')


class RenewalRecordSerializer(serializers.ModelSerializer):
    renewed_by_email = serializers.EmailField(source='renewed_by.email', read_only=True)

    class Meta:
        model = RenewalRecord
        fields = ('id', 'subscription', 'previous_expiry', 'new_expiry', 'renewed_by', 'renewed_by_email', 'created_at', 'idempotency_key')


class SubscriptionSerializer(serializers.ModelSerializer):
    lines = SubscriptionLineSerializer(many=True, read_only=True)
    history = SubscriptionHistorySerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)

    class Meta:
        model = Subscription
        fields = (
            'id', 'number', 'customer', 'customer_name', 'customer_email',
            'plan', 'plan_name', 'quotation', 'start_date', 'expiry_date',
            'billing_frequency', 'payment_terms', 'quantity', 'status',
            'created_by', 'created_at', 'updated_at', 'next_renewal_date',
            'pause_date', 'closure_date', 'closure_reason', 'activated_at',
            'lines', 'history'
        )
        read_only_fields = (
            'id', 'number', 'created_by', 'created_at', 'updated_at', 'status',
            'expiry_date', 'next_renewal_date', 'pause_date', 'closure_date',
            'closure_reason', 'activated_at'
        )
