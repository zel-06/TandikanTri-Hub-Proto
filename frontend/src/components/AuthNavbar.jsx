import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import notifIcon from '../assets/images/notif_icon.png';
import profileIcon from '../assets/images/profile_settings.png';
import NotificationMenu from './NotificationMenu';
import ProfileMenu from './ProfileMenu';

export default function AuthNavbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const rootRef = useRef(null);

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

  return (
    <div ref={rootRef}>
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
            className="btn-icon btn-notification"
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
      <NotificationMenu open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </div>
  );
}
