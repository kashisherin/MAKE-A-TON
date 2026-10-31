from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allows access only to authenticated users with ADMIN role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')


class IsStaff(BasePermission):
    """Allows access only to authenticated users with STAFF role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'STAFF')


class IsAdminOrStaff(BasePermission):
    """Allows access to authenticated users with either ADMIN or STAFF role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ('ADMIN', 'STAFF'))


class IsCustomer(BasePermission):
    """Allows access only to authenticated users with CUSTOMER role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'CUSTOMER')


class IsObjectOwnerOrAdminOrStaff(BasePermission):
    """
    Object-level permission allowing Admin full access, Staff access
    to assigned operational records, and Customers access only to their own linked objects.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'STAFF':
            customer = getattr(obj, 'customer', obj if hasattr(obj, 'assigned_staff') else None)
            if customer:
                # Staff can only access if assigned or unassigned
                return customer.assigned_staff in (request.user, None)
            return True
        if hasattr(obj, 'user') and obj.user is not None:
            return obj.user == request.user
        if hasattr(obj, 'customer') and obj.customer is not None:
            return getattr(obj.customer, 'user', None) == request.user
        return False
