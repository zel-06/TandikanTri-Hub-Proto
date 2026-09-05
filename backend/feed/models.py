from django.conf import settings
from django.db import models

from events.models import Event


class CommunityPost(models.Model):
    class PostType(models.TextChoices):
        ANNOUNCEMENT = 'announcement', 'Announcement'
        GALLERY = 'gallery', 'Gallery'

    post_type = models.CharField(max_length=20, choices=PostType.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    event = models.ForeignKey(
        Event, on_delete=models.SET_NULL, null=True, blank=True, related_name='community_posts'
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class CommunityPostImage(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='community_posts/')

    def __str__(self):
        return f'{self.post.title} image'


class CommunityPostLike(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')
