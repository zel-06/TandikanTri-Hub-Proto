from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import User


class ActiveAccountJWTAuthentication(JWTAuthentication):
    """JWTAuthentication, plus an account_status check on every request.

    SimpleJWT only resolves the user from the token payload - suspending or
    deleting an account (or revoking a staff account) doesn't invalidate
    tokens already issued for it, so without this a suspended/revoked user
    keeps full API access on their existing access token until it naturally
    expires (and can keep refreshing it indefinitely).
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user.account_status != User.AccountStatus.ACTIVE:
            raise AuthenticationFailed('This account no longer has access.', code='account_inactive')
        return user
