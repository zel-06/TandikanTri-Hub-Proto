import re

from django.core.exceptions import ValidationError


def validate_password_complexity(password, username=None, email=None):
    """Enforces the complexity rules shown on the registration form's strength meter."""
    errors = []
    if len(password) < 8:
        errors.append('Password must be at least 8 characters long.')
    if not re.search(r'[A-Z]', password):
        errors.append('Password must contain at least one uppercase letter.')
    if not re.search(r'[a-z]', password):
        errors.append('Password must contain at least one lowercase letter.')
    if not re.search(r'\d', password):
        errors.append('Password must contain at least one number.')
    if not re.search(r'[^A-Za-z0-9]', password):
        errors.append('Password must contain at least one special character.')
    if username and password.lower() == username.lower():
        errors.append('Password cannot be the same as your username.')
    if email and password.lower() == email.lower():
        errors.append('Password cannot be the same as your email.')
    if errors:
        raise ValidationError(errors)
