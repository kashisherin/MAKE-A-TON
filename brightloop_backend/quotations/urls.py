from rest_framework.routers import DefaultRouter
from .views import QuotationViewSet, QuotationTemplateViewSet, QuotationTemplateLineViewSet

router = DefaultRouter()
router.register('templates', QuotationTemplateViewSet, basename='quotation-template')
router.register('template-lines', QuotationTemplateLineViewSet, basename='quotation-template-line')
router.register('', QuotationViewSet, basename='quotation')

urlpatterns = router.urls
