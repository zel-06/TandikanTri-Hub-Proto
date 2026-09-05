import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../roles';

export default function RoleRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    // Never redirect into /dashboard here: every staff role can reach
    // /dashboard/overview, but athletes can't reach any /dashboard/* route,
    // and /dashboard itself redirects to /dashboard/overview - looping
    // back through this same check and hanging the app.
    return <Navigate to={user.role === ROLES.ATHLETE ? '/home' : '/dashboard/overview'} replace />;
  }

  return <Outlet />;
}
