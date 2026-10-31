import re
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from .models import User


def validate_password_rules(value):
    if len(value) <= 8:
        raise serializers.ValidationError('Password must be more than 8 characters long.')
    if not re.search(r'[A-Z]', value):
        raise serializers.ValidationError('Password must contain at least one uppercase letter.')
    if not re.search(r'[a-z]', value):
        raise serializers.ValidationError('Password must contain at least one lowercase letter.')
    if not re.search(r'[^A-Za-z0-9]', value):
        raise serializers.ValidationError('Password must contain at least one special character.')
    validate_password(value)
    return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'company_name')

    def validate_email(self, value):
        value = (value or '').strip().lower()
        if not value:
            raise serializers.ValidationError('Email address cannot be empty.')
        try:
            django_validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError('Enter a valid email address.')
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email address already exists.')
        return value

    def validate_password(self, value):
        return validate_password_rules(value)

    @transaction.atomic
    def create(self, validated_data):
        company_name = validated_data.pop('company_name', '')
        password = validated_data.pop('password')
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')
        contact_name = f"{first_name} {last_name}".strip() or validated_data['email']

        user = User.objects.create_user(
            **validated_data,
            password=password,
            role=User.Role.CUSTOMER
        )

        from customers.models import Customer
        Customer.objects.create(
            user=user,
            email=user.email,
            contact_person=contact_name,
            company_name=company_name
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined')
        read_only_fields = ('id', 'email', 'role', 'date_joined')


class StaffCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'role', 'is_active')
        read_only_fields = ('id',)

    def validate_email(self, value):
        value = (value or '').strip().lower()
        if not value:
            raise serializers.ValidationError('Email address cannot be empty.')
        try:
            django_validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError('Enter a valid email address.')
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email address already exists.')
        return value

    def validate_password(self, value):
        return validate_password_rules(value)

    def validate_role(self, value):
        if value not in (User.Role.STAFF, User.Role.ADMIN):
            raise serializers.ValidationError('Only STAFF or ADMIN roles can be provisioned via this endpoint.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.is_staff = (user.role == User.Role.ADMIN)
        user.is_superuser = (user.role == User.Role.ADMIN)
        user.save()
        return user
