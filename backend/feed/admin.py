from django.contrib import admin

from .models import CommunityPost, CommunityPostImage, CommunityPostLike

admin.site.register(CommunityPost)
admin.site.register(CommunityPostImage)
admin.site.register(CommunityPostLike)
