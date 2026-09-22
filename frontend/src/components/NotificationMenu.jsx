import { useEffect, useState } from 'react';
import * as notificationsApi from '../api/notifications';

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

function formatFullDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationMenu({ open, onClose, onUnreadChange }) {
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open) return;
    notificationsApi.listNotifications()
      .then((list) => {
        setNotifications(list);
        onUnreadChange?.(list.some((n) => !n.read));
      })
      .catch(() => {});
  }, [open, onUnreadChange]);

  async function handleOpenItem(notification) {
    setSelected(notification);
    if (!notification.read) {
      await notificationsApi.markNotificationRead(notification.id).catch(() => {});
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n));
        onUnreadChange?.(next.some((n) => !n.read));
        return next;
      });
    }
  }

  async function handleReadAll() {
    await notificationsApi.markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onUnreadChange?.(false);
  }

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <>
      <div className={`notification-menu${open ? ' active' : ''}`}>
        <div className="notification-header">
          <div className="notification-header-row">
            <div>
              <h3>Notifications</h3>
              <p>Stay updated with your events</p>
            </div>
            <div className="notification-header-actions">
              {hasUnread && (
                <button type="button" className="notification-read-all" onClick={handleReadAll}>
                  Read all
                </button>
              )}
              <button type="button" className="notification-close" onClick={onClose} aria-label="Close notifications">
                &times;
              </button>
            </div>
          </div>
        </div>
        <div className="notification-body">
          {notifications.length === 0 && (
            <p className="empty-state">No notifications yet.</p>
          )}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notification-item${notification.read ? '' : ' unread'}`}
              onClick={() => handleOpenItem(notification)}
            >
              <div className="notification-content">
                <div className="notification-text">
                  <h4>{notification.title}</h4>
                  <p>{notification.body}</p>
                  <div className="notification-time">{timeAgo(notification.created_at)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="modal-overlay"
          style={{ display: 'flex' }}
          onClick={(e) => { e.stopPropagation(); setSelected(null); }}
        >
          <div className="modal-content notification-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected.title}</h3>
              <button type="button" className="close-btn" onClick={() => setSelected(null)} aria-label="Close">
                &times;
              </button>
            </div>
            <p className="notification-detail-time">{formatFullDate(selected.created_at)}</p>
            <p className="notification-detail-body">{selected.body}</p>
          </div>
        </div>
      )}
    </>
  );
}
