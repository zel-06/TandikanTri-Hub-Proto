from rest_framework import serializers

from .models import AuditLogEntry


class AuditLogEntrySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLogEntry
        fields = ['id', 'actor', 'actor_name', 'module', 'action', 'target_description', 'metadata', 'created_at']

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() or obj.actor.username if obj.actor else 'System'
