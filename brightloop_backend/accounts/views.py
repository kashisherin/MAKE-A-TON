from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import User
from .permissions import IsAdmin
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserSerializer,
    StaffCreateSerializer,
    validate_password_rules
)
from audit.services import record_audit


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RegisterSerializer, responses={201: RegisterSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_audit(user, 'USER_REGISTERED', user, after={'email': user.email, 'role': user.role})
        return Response({
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses={200: dict})
    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        if not email or not password:
            return Response({
                'detail': 'Both email and password are required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({
                'detail': 'Invalid email or password.'
            }, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({
                'detail': 'This account has been deactivated.'
            }, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetRequestSerializer, responses={200: dict})
    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if user and user.is_active:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_RESET_URL}?uid={uid}&token={token}"
            subject = 'Brightloop – Password Reset Request'
            message = (
                f"Hello {user.first_name or user.email},\n\n"
                f"You requested a password reset for your Brightloop account.\n"
                f"Click the link below to set a new password:\n{reset_url}\n\n"
                f"If you did not request this, please ignore this email."
            )
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)

        return Response({
            'detail': 'If an active account exists with that email, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: dict})
    def post(self, request):
        uid_b64 = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password')

        if not uid_b64 or not token or not password:
            return Response({
                'detail': 'uid, token, and new password are required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({'detail': 'Invalid or expired password reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Invalid or expired reset token.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password_rules(password)
        except Exception as e:
            detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response({'password': detail}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=['password'])
        record_audit(user, 'PASSWORD_RESET_COMPLETED', user, after={'email': user.email})
        return Response({'detail': 'Password reset successful. You may now log in with your new password.'}, status=status.HTTP_200_OK)


class UserManagementViewSet(ModelViewSet):
    queryset = User.objects.all().order_by('email')
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return StaffCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        record_audit(self.request.user, 'USER_PROVISIONED', user, after={'email': user.email, 'role': user.role})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({'detail': 'You cannot deactivate your own administrative account.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=['is_active'])
        record_audit(request.user, 'USER_DEACTIVATED', user, after={'email': user.email, 'is_active': False})
        return Response({'id': user.pk, 'email': user.email, 'is_active': False}, status=status.HTTP_200_OK)
