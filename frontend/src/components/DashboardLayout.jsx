import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, modulesForRole } from '../roles';
import logo from '../assets/images/logo.png';

export default function DashboardLayout({ title, eyebrow, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const modules = modulesForRole(user.role);

  function handleLogout() {
    // Logout always fires from a page behind ProtectedRoute, whose own
    // auth redirect to /login wins the race against any other target here.
    logout();
    navigate('/login');
  }

  return (
    <div className="admin-panel">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <img src={logo} alt="Tandikan Logo" />
            <div>
              <h1>Tandikan Tri Team</h1>
              <p>{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            {modules.map((module) => (
              <Link
                key={module.key}
                to={module.path}
                className={location.pathname === module.path ? 'active' : ''}
              >
                {module.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <p>Signed in as</p>
          <div className="sidebar-stat">
            <span className="stat-label">{user.full_name || user.username}</span>
          </div>
          <Link
            to="/home"
            className="btn btn-secondary"
            style={{ marginTop: '12px', width: '100%', display: 'block', textAlign: 'center' }}
          >
            Visit Main Website
          </Link>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '12px', width: '100%' }}
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          {actions && <div className="top-actions">{actions}</div>}
        </header>

        {children}
      </main>
    </div>
  );
}
