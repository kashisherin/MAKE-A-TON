from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id', 'user', 'assigned_staff', 'company_name', 'contact_person',
            'email', 'phone_number', 'address', 'city', 'state', 'postal_code',
            'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at')

    def validate_email(self, value):
        value = (value or '').strip().lower()
        if not value:
            raise serializers.ValidationError('Email address cannot be empty.')
        # Check uniqueness excluding self
        qs = Customer.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A customer profile with this email address already exists.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        email = attrs.get('email', getattr(self.instance, 'email', None))
        user = attrs.get('user', getattr(self.instance, 'user', None))

        if user and email and user.email:
            if user.email.strip().lower() != email.strip().lower():
                raise serializers.ValidationError({
                    'email': f"Customer email ('{email}') must match linked user account email ('{user.email}')."
                })

        if request and request.user.role == 'CUSTOMER':
            # Customers are not permitted to change their linked user, assigned staff, or active flag
            if 'user' in attrs and attrs['user'] != getattr(self.instance, 'user', None):
                raise serializers.ValidationError({'user': 'Customers cannot change account linkage.'})
            if 'assigned_staff' in attrs:
                raise serializers.ValidationError({'assigned_staff': 'Customers cannot assign staff.'})
            if 'is_active' in attrs and attrs['is_active'] != getattr(self.instance, 'is_active', True):
                raise serializers.ValidationError({'is_active': 'Customers cannot alter active status.'})

        return attrs
