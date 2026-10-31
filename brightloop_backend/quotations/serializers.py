from decimal import Decimal
from datetime import timedelta
import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import serializers

from .models import Quotation, QuotationLine, QuotationTemplate, QuotationTemplateLine
from products.serializers import ProductSerializer, VariantSerializer
from plans.serializers import PlanSerializer


class QuotationTemplateLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationTemplateLine
        fields = ('id', 'template', 'product', 'variant', 'plan', 'quantity')
        extra_kwargs = {'template': {'required': False}}

    def validate(self, attrs):
        product = attrs.get('product', getattr(self.instance, 'product', None))
        variant = attrs.get('variant', getattr(self.instance, 'variant', None))
        plan = attrs.get('plan', getattr(self.instance, 'plan', None))

        if not product and not plan and not variant:
            raise serializers.ValidationError('A template line must reference either a product, a variant, or a plan.')

        if variant and product and variant.product_id != product.id:
            raise serializers.ValidationError({
                'variant': f"Variant '{variant.variant_name}' does not belong to product '{product.name}'."
            })
        if variant and not product:
            attrs['product'] = variant.product

        return attrs


class QuotationTemplateSerializer(serializers.ModelSerializer):
    lines = QuotationTemplateLineSerializer(many=True, required=False)

    class Meta:
        model = QuotationTemplate
        fields = ('id', 'name', 'description', 'validity_days', 'is_active', 'lines', 'created_at')
        read_only_fields = ('id', 'created_at')

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        template = QuotationTemplate.objects.create(**validated_data)
        for line_data in lines_data:
            line_data.pop('template', None)
            QuotationTemplateLine.objects.create(template=template, **line_data)
        return template

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                line_data.pop('template', None)
                QuotationTemplateLine.objects.create(template=instance, **line_data)
        return instance


class QuotationLineSerializer(serializers.ModelSerializer):
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = QuotationLine
        fields = ('id', 'product', 'variant', 'plan', 'quantity', 'unit_price', 'line_total')
        read_only_fields = ('id', 'line_total')

    def validate(self, attrs):
        product = attrs.get('product', getattr(self.instance, 'product', None))
        variant = attrs.get('variant', getattr(self.instance, 'variant', None))
        plan = attrs.get('plan', getattr(self.instance, 'plan', None))

        if not product and not plan and not variant:
            raise serializers.ValidationError('A quotation line must reference either a product, a variant, or a plan.')

        if variant and product and variant.product_id != product.id:
            raise serializers.ValidationError({
                'variant': f"Variant '{variant.variant_name}' does not belong to product '{product.name}'."
            })
        if variant and not product:
            attrs['product'] = variant.product

        return attrs


class QuotationSerializer(serializers.ModelSerializer):
    valid_until = serializers.DateField(required=False, allow_null=True)
    lines = QuotationLineSerializer(many=True)

    class Meta:
        model = Quotation
        fields = (
            'id', 'number', 'customer', 'template', 'created_by', 'created_at',
            'valid_until', 'status', 'notes', 'subtotal', 'discount_reference',
            'total', 'converted', 'lines'
        )
        read_only_fields = ('id', 'number', 'created_by', 'created_at', 'subtotal', 'total', 'converted')

    def validate(self, attrs):
        valid_until = attrs.get('valid_until')
        today = timezone.localdate()
        if valid_until and valid_until < today:
            raise serializers.ValidationError({'valid_until': 'valid_until cannot be in the past.'})
        return attrs

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        template = validated_data.get('template')
        request = self.context.get('request')
        user = request.user if request else None

        # Server-side unique number generation
        short_id = uuid.uuid4().hex[:6].upper()
        validated_data['number'] = f"QT-{timezone.now():%Y%m%d%H%M%S}-{short_id}"
        if user and user.is_authenticated:
            validated_data['created_by'] = user

        # Set valid_until dynamically from template validity_days or default 15 days
        valid_until = validated_data.get('valid_until')
        if not valid_until:
            if template:
                valid_until = timezone.localdate() + timedelta(days=template.validity_days)
            else:
                valid_until = timezone.localdate() + timedelta(days=15)
        validated_data['valid_until'] = valid_until

        quotation = Quotation.objects.create(**validated_data)
        subtotal = Decimal('0.00')

        for item in lines_data:
            variant = item.get('variant')
            product = item.get('product') or (variant.product if variant else None)
            plan = item.get('plan')
            quantity = item.get('quantity', 1)

            # Server-side authoritative price determination
            if variant:
                price = variant.final_price
            elif product:
                price = product.sales_price
            elif plan:
                price = plan.price
            else:
                price = item.get('unit_price', Decimal('0.00'))

            line_total = Decimal(str(price)) * int(quantity)
            QuotationLine.objects.create(
                quotation=quotation,
                product=product,
                variant=variant,
                plan=plan,
                quantity=quantity,
                unit_price=price,
                line_total=line_total
            )
            subtotal += line_total

        quotation.subtotal = subtotal
        quotation.total = subtotal
        quotation.save(update_fields=['subtotal', 'total'])
        return quotation
