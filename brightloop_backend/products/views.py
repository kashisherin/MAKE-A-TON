from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdminOrStaff
from .models import Product, ProductVariant
from .serializers import ProductSerializer, VariantSerializer
from audit.services import record_audit


class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all().prefetch_related('variants')
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'product_type', 'description']
    filterset_fields = ['is_active', 'product_type']
    ordering_fields = ['name', 'sales_price', 'created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrStaff()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        product = serializer.save()
        record_audit(
            self.request.user,
            'PRODUCT_CREATED',
            product,
            after={'name': product.name, 'sales_price': str(product.sales_price), 'cost_price': str(product.cost_price)}
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        before = {
            'name': instance.name,
            'sales_price': str(instance.sales_price),
            'cost_price': str(instance.cost_price),
            'is_active': instance.is_active,
        }
        product = serializer.save()
        after = {
            'name': product.name,
            'sales_price': str(product.sales_price),
            'cost_price': str(product.cost_price),
            'is_active': product.is_active,
        }
        record_audit(self.request.user, 'PRODUCT_UPDATED', product, before=before, after=after)

    def perform_destroy(self, instance):
        before = {'is_active': instance.is_active}
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        record_audit(self.request.user, 'PRODUCT_DEACTIVATED', instance, before=before, after={'is_active': False})

    @action(detail=True, methods=['get', 'post'], url_path='variants')
    def variants(self, request, pk=None):
        product = self.get_object()
        if request.method == 'GET':
            serializer = VariantSerializer(product.variants.all(), many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # POST requires IsAdminOrStaff
        if not (request.user and request.user.role in ('ADMIN', 'STAFF')):
            return Response({'detail': 'Only administrators or staff can create variants.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data['product'] = product.id
        serializer = VariantSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        variant = serializer.save(product=product)
        record_audit(
            request.user,
            'VARIANT_CREATED',
            variant,
            after={
                'variant_name': variant.variant_name,
                'brand': variant.brand,
                'price_adjustment': str(variant.price_adjustment),
                'final_price': str(variant.final_price)
            }
        )
        return Response(VariantSerializer(variant).data, status=status.HTTP_201_CREATED)
