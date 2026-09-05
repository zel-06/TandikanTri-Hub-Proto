import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import { ROLES } from './roles';

import Landing from './pages/public/Landing';
import About from './pages/public/About';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

import Home from './pages/app/Home';
import Events from './pages/app/Events';
import EventDetail from './pages/app/EventDetail';
import Profile from './pages/app/Profile';
import RegistrationFlow from './pages/app/registerFlow/RegistrationFlow';

import Overview from './pages/dashboard/Overview';
import EventManagement from './pages/dashboard/EventManagement';
import Finance from './pages/dashboard/Finance';
import UserManagement from './pages/dashboard/UserManagement';
import Audit from './pages/dashboard/Audit';
import Roles from './pages/dashboard/Roles';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public shell */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/:eventId/register/:categoryId" element={<RegistrationFlow />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />

            <Route element={<RoleRoute roles={[ROLES.SUPER_ADMIN, ROLES.EVENT_DIRECTOR, ROLES.FINANCE_OFFICER, ROLES.OPERATIONS_MANAGER]} />}>
              <Route path="/dashboard/overview" element={<Overview />} />
            </Route>
            <Route element={<RoleRoute roles={[ROLES.SUPER_ADMIN, ROLES.EVENT_DIRECTOR]} />}>
              <Route path="/dashboard/events" element={<EventManagement />} />
            </Route>
            <Route element={<RoleRoute roles={[ROLES.SUPER_ADMIN, ROLES.FINANCE_OFFICER]} />}>
              <Route path="/dashboard/finance" element={<Finance />} />
            </Route>
            <Route element={<RoleRoute roles={[ROLES.SUPER_ADMIN, ROLES.OPERATIONS_MANAGER]} />}>
              <Route path="/dashboard/users" element={<UserManagement />} />
              <Route path="/dashboard/audit" element={<Audit />} />
            </Route>
            <Route element={<RoleRoute roles={[ROLES.SUPER_ADMIN]} />}>
              <Route path="/dashboard/roles" element={<Roles />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
