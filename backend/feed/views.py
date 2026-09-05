from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsEventStaff
from audit.models import AuditLogEntry, log_action
from notifications.models import Notification

from .models import CommunityPost, CommunityPostImage, CommunityPostLike
from .serializers import CommunityPostSerializer


def notify_new_post(post, actor):
    if post.post_type == CommunityPost.PostType.ANNOUNCEMENT:
        title = f'New Announcement: {post.title}'
    else:
        title = f'New Event Photos: {post.title}'
    body = post.body.strip() or 'Check it out on the community feed.'

    recipients = User.objects.exclude(id=actor.id)
    Notification.objects.bulk_create([
        Notification(user=user, kind=Notification.Kind.SYSTEM, title=title, body=body)
        for user in recipients
    ])


class CommunityPostListCreateView(generics.ListCreateAPIView):
    serializer_class = CommunityPostSerializer
    queryset = CommunityPost.objects.select_related('event', 'created_by').prefetch_related('images', 'likes')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsEventStaff()]
        return [AllowAny()]

    def perform_create(self, serializer):
        post = serializer.save(created_by=self.request.user)
        for image in self.request.FILES.getlist('images'):
            CommunityPostImage.objects.create(post=post, image=image)
        log_action(
            self.request.user, AuditLogEntry.Module.EVENTS, 'Posted to community feed',
            target_description=post.title,
        )
        notify_new_post(post, self.request.user)


class CommunityPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CommunityPost.objects.all()
    serializer_class = CommunityPostSerializer
    permission_classes = [IsEventStaff]

    def perform_update(self, serializer):
        post = serializer.save()
        for image in self.request.FILES.getlist('images'):
            CommunityPostImage.objects.create(post=post, image=image)
        log_action(self.request.user, AuditLogEntry.Module.EVENTS, 'Edited community post', target_description=post.title)

    def perform_destroy(self, instance):
        title = instance.title
        instance.delete()
        log_action(self.request.user, AuditLogEntry.Module.EVENTS, 'Deleted community post', target_description=title)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like(request, pk):
    try:
        post = CommunityPost.objects.get(pk=pk)
    except CommunityPost.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    like, created = CommunityPostLike.objects.get_or_create(post=post, user=request.user)
    if not created:
        like.delete()
        liked = False
    else:
        liked = True

    return Response({'liked_by_me': liked, 'likes_count': post.likes.count()})
