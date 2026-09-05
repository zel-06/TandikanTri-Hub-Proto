from rest_framework import serializers

from events.models import Event

from .models import CommunityPost, CommunityPostImage


class CommunityPostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityPostImage
        fields = ['id', 'image']


class CommunityPostSerializer(serializers.ModelSerializer):
    images = CommunityPostImageSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    event = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(), required=False, allow_null=True
    )
    event_title = serializers.CharField(source='event.title', read_only=True, default=None)

    class Meta:
        model = CommunityPost
        fields = [
            'id', 'post_type', 'title', 'body', 'event', 'event_title',
            'images', 'likes_count', 'liked_by_me', 'author_name', 'created_at',
        ]

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user_id=request.user.id).exists()

    def get_author_name(self, obj):
        return 'Tandikan Tri Team'
