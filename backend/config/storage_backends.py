from urllib.parse import quote

from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PublicMediaStorage(S3Boto3Storage):
    bucket_name = 'communityfeed'
    querystring_auth = False
    file_overwrite = False

    def url(self, name, parameters=None, expire=None):
        # Supabase's S3-compatible gateway requires a valid AWS signature on every
        # request no matter what the bucket's "Public" toggle in the dashboard says —
        # that toggle only applies to Supabase's own native object API. So for a public
        # bucket we build that native public URL directly instead of the signed/S3-style
        # one S3Boto3Storage would otherwise generate.
        base = settings.AWS_S3_ENDPOINT_URL.rstrip('/').replace('/storage/v1/s3', '/storage/v1/object/public')
        quoted_name = quote(name.lstrip('/'))
        return f'{base}/{self.bucket_name}/{quoted_name}'


class PrivateIDStorage(S3Boto3Storage):
    bucket_name = 'id-documents'
    querystring_auth = True
    querystring_expire = 300
    custom_domain = False
    file_overwrite = False
