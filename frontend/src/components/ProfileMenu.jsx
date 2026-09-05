import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../roles';
import logo from '../assets/images/logo.png';

export default function ProfileMenu({ open }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    // Logout always fires from a page behind ProtectedRoute, whose own
    // auth redirect to /login wins the race against any other target here.
    logout();
    navigate('/login');
  }

  return (
    <div className={`profile-menu${open ? ' active' : ''}`}>
      <div className="profile-menu-header">
        <div className="profile-picture">
          <img src={logo} alt="Profile" />
        </div>
        <div className="profile-info">
          <h4>{user.full_name || user.username}</h4>
          <p>{user.email}</p>
        </div>
      </div>
      <div className="profile-menu-body">
        <Link to="/profile" className="menu-item"><span>Profile Settings</span></Link>
        <Link to="/profile" className="menu-item"><span>Account Settings</span></Link>
        {user.role !== ROLES.ATHLETE && (
          <Link to="/dashboard/overview" className="menu-item"><span>Admin Panel</span></Link>
        )}
        <div className="menu-divider"></div>
        <a href="#logout" className="menu-item logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
          <span>Log Out</span>
        </a>
      </div>
    </div>
  );
}
