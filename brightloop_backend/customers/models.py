from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Customer(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_profile',
        null=True,
        blank=True
    )
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_customers',
        limit_choices_to={'role': 'STAFF'}
    )
    company_name = models.CharField(max_length=200, blank=True)
    contact_person = models.CharField(max_length=160)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['company_name']),
            models.Index(fields=['is_active']),
        ]

    def clean(self):
        super().clean()
        if self.email:
            self.email = self.email.strip().lower()
        if self.user and self.email:
            user_email = (self.user.email or '').strip().lower()
            if user_email and self.email != user_email:
                raise ValidationError({'email': f"Customer profile email ('{self.email}') must match linked account email ('{user_email}')."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.company_name or self.contact_person or self.email
