from decimal import Decimal
from rest_framework import serializers
from .models import Product, ProductVariant


class VariantSerializer(serializers.ModelSerializer):
    final_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ProductVariant
        fields = ('id', 'product', 'variant_name', 'brand', 'price_adjustment', 'final_price', 'is_active')
        read_only_fields = ('id', 'final_price')

    def validate_price_adjustment(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError('Price adjustment cannot be negative.')
        return value

    def validate(self, attrs):
        brand = attrs.get('brand', getattr(self.instance, 'brand', ''))
        adjustment = attrs.get('price_adjustment', getattr(self.instance, 'price_adjustment', Decimal('0.00')))
        if brand and brand.strip().lower() == 'odoo':
            if Decimal(str(adjustment)) != Decimal('560.00'):
                raise serializers.ValidationError({
                    'price_adjustment': 'The specified Odoo brand variant must add exactly ₹560.00 to the base product price.'
                })
        return attrs


class ProductSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'product_type', 'sales_price', 'cost_price', 'description', 'is_active', 'variants', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_sales_price(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError('Sales price cannot be negative.')
        return value

    def validate_cost_price(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError('Cost price cannot be negative.')
        return value
