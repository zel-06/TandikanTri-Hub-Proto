import { useEffect, useState } from 'react';
import * as notificationsApi from '../api/notifications';

const ICONS = {
  registration: '✅',
  payment: '⚠️',
  verification: '🪪',
  system: '📰',
};

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function NotificationMenu({ open, onClose }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!open) return;
    notificationsApi.listNotifications().then(setNotifications).catch(() => {});
  }, [open]);

  async function handleOpenItem(notification) {
    if (!notification.read) {
      await notificationsApi.markNotificationRead(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }
  }

  return (
    <div className={`notification-menu${open ? ' active' : ''}`}>
      <div className="notification-header">
        <h3>Notifications</h3>
        <p>Stay updated with your events</p>
      </div>
      <div className="notification-body">
        {notifications.length === 0 && (
          <p style={{ padding: '1.5rem', color: '#7c95bf' }}>No notifications yet.</p>
        )}
        {notifications.map((notification) => (
          <a
            key={notification.id}
            href="#notification"
            className={`notification-item${notification.read ? '' : ' unread'}`}
            onClick={(e) => {
              e.preventDefault();
              handleOpenItem(notification);
            }}
          >
            <div className="notification-content">
              <span className="notification-icon">{ICONS[notification.kind] || '📰'}</span>
              <div className="notification-text">
                <h4>{notification.title}</h4>
                <p>{notification.body}</p>
                <div className="notification-time">{timeAgo(notification.created_at)}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
