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

# Separate salt (and shorter validity) for password-reset tokens, so a
# registration-verification token can never be replayed to reset an existing
# account's password, or vice versa.
RESET_TOKEN_SALT = 'password-reset'
RESET_TOKEN_MAX_AGE_SECONDS = 15 * 60


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


def make_verification_token(email, via='otp'):
    return signing.dumps({'email': email.lower(), 'via': via}, salt=TOKEN_SALT)


def read_verification_token(token):
    """Returns {'email', 'via'} for a token, or None if missing/invalid/expired.

    'via' is 'otp' for the normal send-code/verify-code flow, or 'google' when the
    token was minted after verifying a Google ID token server-side - RegisterSerializer
    uses this to decide whether a password is required, so it can't be spoofed by a
    client simply omitting the password fields on an ordinary OTP-verified token.
    """
    if not token:
        return None
    try:
        data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE_SECONDS)
    except signing.BadSignature:
        return None
    return {'email': data.get('email'), 'via': data.get('via', 'otp')}


def send_password_reset_email(email, code):
    send_mail(
        subject='Your Tandikan Tri-Hub password reset code',
        message=(
            f'Your password reset code is {code}. It expires in {CODE_TTL_MINUTES} minutes.\n\n'
            'If you did not request this, you can safely ignore this email - your password will not be changed.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
    )


def make_reset_token(email):
    return signing.dumps({'email': email.lower()}, salt=RESET_TOKEN_SALT)


def read_reset_email(token):
    """Returns the verified email for a password-reset token, or None if missing/invalid/expired."""
    if not token:
        return None
    try:
        data = signing.loads(token, salt=RESET_TOKEN_SALT, max_age=RESET_TOKEN_MAX_AGE_SECONDS)
    except signing.BadSignature:
        return None
    return data.get('email')
