"""
Django settings for the Tandikan Tri-Hub backend.
"""

from datetime import timedelta
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = 'django-insecure-7jc214cg3bo95s&&%-gk76j$99&l630csox+&v72i%u5+yard_'

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.vercel.app']


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    'accounts',
    'events',
    'registrations',
    'audit',
    'notifications',
    'dashboard',
    'feed',
    'storages',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT', default='5432'),
        'OPTIONS': {'sslmode': 'require'},
        # Serverless (Vercel) functions are short-lived per-request processes, so holding a
        # connection open between requests just hogs a pooler slot instead of freeing it back
        # up. Only reuse connections on a persistent server (local dev / traditional hosting).
        'CONN_MAX_AGE': 0 if env.bool('VERCEL', default=False) else 60,
    }
}


AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Manila'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=6),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://.*\.vercel\.app$',
]

FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')

#Email — falls back to printing to the console until real SMTP credentials are supplied
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = env.int('EMAIL_PORT', default=587)
    EMAIL_USE_TLS = True
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='Tandikan Tri-Hub <no-reply@tandikantrihub.com>')

#PayMongo payment gateway
PAYMONGO_SECRET_KEY = env('PAYMONGO_SECRET_KEY')
PAYMONGO_PUBLIC_KEY = env('PAYMONGO_PUBLIC_KEY')
PAYMONGO_WEBHOOK_SECRET = env('PAYMONGO_WEBHOOK_SECRET')

#storage settings for AWS S3
AWS_ACCESS_KEY_ID = env('SUPABASE_S3_ACCESS_KEY')
AWS_SECRET_ACCESS_KEY = env('SUPABASE_S3_SECRET_KEY')
AWS_STORAGE_BUCKET_NAME = 'communityfeed'  # default/fallback bucket
AWS_S3_ENDPOINT_URL = env('SUPABASE_S3_ENDPOINT_URL')  # https://xxxxx.supabase.co/storage/v1/s3
AWS_S3_REGION_NAME = env('SUPABASE_S3_REGION')
AWS_S3_ADDRESSING_STYLE = 'path'
AWS_DEFAULT_ACL = None  # Supabase manages ACLs via bucket policy, not per-object
AWS_QUERYSTRING_AUTH = False  # for public buckets — no signed URLs needed

# Django 5.1+ removed DEFAULT_FILE_STORAGE in favor of this dict. "default" is the fallback
# used by any FileField/ImageField that doesn't pass its own storage= explicitly.
STORAGES = {
    'default': {
        'BACKEND': 'config.storage_backends.PublicMediaStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}