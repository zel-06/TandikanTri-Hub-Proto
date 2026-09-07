"""One-off script: move existing local media/ files up to Supabase Storage.

Run with: python migrate_media.py
Safe to re-run — files already pointing at Storage (not the local media/ folder)
are skipped automatically since local_storage.path() will 404 for them.
"""
import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files import File
from django.core.files.storage import FileSystemStorage

from accounts.models import User
from events.models import Event
from feed.models import CommunityPostImage
from registrations.models import Payment

local_storage = FileSystemStorage()


def migrate_field(queryset, field_name):
    for obj in queryset:
        field_file = getattr(obj, field_name)
        if not field_file:
            continue

        local_path = local_storage.path(field_file.name)
        if not os.path.exists(local_path):
            print(f"Skipping {obj.pk} — file not found locally: {local_path}")
            continue

        with open(local_path, 'rb') as f:
            field_file.save(os.path.basename(local_path), File(f), save=True)
        print(f"Migrated {obj.pk}: {field_file.name}")


migrate_field(User.objects.exclude(id_document=''), 'id_document')
migrate_field(Event.objects.exclude(hero_image=''), 'hero_image')
migrate_field(CommunityPostImage.objects.exclude(image=''), 'image')
migrate_field(Payment.objects.exclude(proof_of_payment=''), 'proof_of_payment')
