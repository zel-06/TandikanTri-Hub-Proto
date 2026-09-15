import random
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.utils import timezone

CODE_TTL_MINUTES = 5
RESEND_COOLDOWN_SECONDS = 60
TOKEN_SALT = 'email-verification'
TOKEN_MAX_AGE_SECONDS = 30 * 60


def generate_code():
    return f'{random.randint(0, 999999):06d}'


def code_expiry():
    return timezone.now() + timedelta(minutes=CODE_TTL_MINUTES)


def send_verification_email(email, code):
    send_mail(
        subject='Your Tandikan Tri-Hub verification code',
        message=(
            f'Your verification code is {code}. It expires in {CODE_TTL_MINUTES} minutes.\n\n'
            'If you did not request this, you can safely ignore this email.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
    )


def make_verification_token(email):
    return signing.dumps({'email': email.lower()}, salt=TOKEN_SALT)


def read_verified_email(token):
    """Returns the verified email for a token, or None if the token is missing/invalid/expired."""
    if not token:
        return None
    try:
        data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE_SECONDS)
    except signing.BadSignature:
        return None
    return data.get('email')
