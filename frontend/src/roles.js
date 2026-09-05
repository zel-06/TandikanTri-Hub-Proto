export const ROLES = {
  ATHLETE: 'athlete',
  SUPER_ADMIN: 'super_admin',
  EVENT_DIRECTOR: 'event_director',
  FINANCE_OFFICER: 'finance_officer',
  OPERATIONS_MANAGER: 'operations_manager',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.EVENT_DIRECTOR]: 'Event Director',
  [ROLES.FINANCE_OFFICER]: 'Finance Officer',
  [ROLES.OPERATIONS_MANAGER]: 'Operations Manager',
};

// Which dashboard modules each staff role can access, and the sidebar order/labels.
export const DASHBOARD_MODULES = [
  { key: 'overview', label: 'Analytics & Overview', path: '/dashboard/overview', roles: [
    ROLES.SUPER_ADMIN, ROLES.EVENT_DIRECTOR, ROLES.FINANCE_OFFICER, ROLES.OPERATIONS_MANAGER,
  ] },
  { key: 'events', label: 'Event Management', path: '/dashboard/events', roles: [
    ROLES.SUPER_ADMIN, ROLES.EVENT_DIRECTOR,
  ] },
  { key: 'finance', label: 'Finance & Revenue Management', path: '/dashboard/finance', roles: [
    ROLES.SUPER_ADMIN, ROLES.FINANCE_OFFICER,
  ] },
  { key: 'users', label: 'User Management', path: '/dashboard/users', roles: [
    ROLES.SUPER_ADMIN, ROLES.OPERATIONS_MANAGER,
  ] },
  { key: 'audit', label: 'Security & Audit Trail', path: '/dashboard/audit', roles: [
    ROLES.SUPER_ADMIN, ROLES.OPERATIONS_MANAGER,
  ] },
  { key: 'roles', label: 'System Access & Role Management', path: '/dashboard/roles', roles: [
    ROLES.SUPER_ADMIN,
  ] },
];

export function modulesForRole(role) {
  return DASHBOARD_MODULES.filter((m) => m.roles.includes(role));
}
