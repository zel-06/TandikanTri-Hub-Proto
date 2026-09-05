import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import notifIcon from '../assets/images/notif_icon.png';
import profileIcon from '../assets/images/profile_settings.png';
import NotificationMenu from './NotificationMenu';
import ProfileMenu from './ProfileMenu';
import * as notificationsApi from '../api/notifications';

const POLL_INTERVAL_MS = 20000;
const TOAST_DURATION_MS = 6000;

export default function AuthNavbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [toasts, setToasts] = useState([]);
  const rootRef = useRef(null);
  const seenIdsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const list = await notificationsApi.listNotifications();
        if (cancelled) return;

        if (seenIdsRef.current === null) {
          // First load: remember what's already there, don't toast for old notifications.
          seenIdsRef.current = new Set(list.map((n) => n.id));
        } else {
          const freshUnread = list.filter((n) => !n.read && !seenIdsRef.current.has(n.id));
          freshUnread.forEach((n) => seenIdsRef.current.add(n.id));
          if (freshUnread.length > 0) {
            setToasts((prev) => [...prev, ...freshUnread.map((n) => ({ id: n.id, title: n.title, body: n.body }))]);
            freshUnread.forEach((n) => {
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== n.id));
              }, TOAST_DURATION_MS);
            });
          }
        }

        setHasUnread(list.some((n) => !n.read));
      } catch {
        // ignore — next poll will retry
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setProfileOpen(false);
        setNotificationOpen(false);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div ref={rootRef}>
      <div className="notification-toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="notification-toast">
            <div className="notification-toast-text">
              <strong>{toast.title}</strong>
              <p>{toast.body}</p>
            </div>
            <button
              type="button"
              className="notification-toast-close"
              onClick={() => dismissToast(toast.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <header className="navbar">
        <div className="logo-container">
          <Link to="/home"><img src={logo} alt="Tandikan Tri Team Logo" /></Link>
          <span className="logo-text">Tandikan Tri-Hub</span>
        </div>
        <nav className="nav-links">
          <Link to="/home">Home</Link>
          <Link to="/events">Events</Link>
          <Link to="/about">About</Link>
        </nav>
        <div className="nav-actions">
          <button
            className={`btn-icon btn-notification${hasUnread ? ' has-unread' : ''}`}
            title="Notifications"
            onClick={(e) => {
              e.stopPropagation();
              setProfileOpen(false);
              setNotificationOpen((v) => !v);
            }}
          >
            <img src={notifIcon} alt="" />
          </button>
          <button
            className="btn-icon btn-profile"
            title="Profile & Dashboard"
            onClick={(e) => {
              e.stopPropagation();
              setNotificationOpen(false);
              setProfileOpen((v) => !v);
            }}
          >
            <img src={profileIcon} alt="" />
          </button>
        </div>
      </header>

      <ProfileMenu open={profileOpen} />
      <NotificationMenu
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        onUnreadChange={setHasUnread}
      />
    </div>
  );
}
