from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from accounts.views import (
    RegisterView,
    LoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    UserManagementViewSet
)

user_router = DefaultRouter()
user_router.register("users", UserManagementViewSet, basename="user-management")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/v1/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/v1/auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('api/v1/auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('api/v1/auth/', include(user_router.urls)),
    path('api/v1/customers/', include('customers.urls')),
    path('api/v1/products/', include('products.urls')),
    path('api/v1/plans/', include('plans.urls')),
    path('api/v1/quotations/', include('quotations.urls')),
    path('api/v1/subscriptions/', include('subscriptions.urls')),
    path('api/v1/audit/', include('audit.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
