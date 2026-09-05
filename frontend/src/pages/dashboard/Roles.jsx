import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import * as accountsApi from '../../api/accounts';
import { ROLE_LABELS, ROLES } from '../../roles';

const emptyForm = {
  first_name: '', last_name: '', username: '', email: '', role: '', temp_password: '',
};

const ASSIGNABLE_ROLES = [ROLES.EVENT_DIRECTOR, ROLES.FINANCE_OFFICER, ROLES.OPERATIONS_MANAGER, ROLES.SUPER_ADMIN];

export default function Roles() {
  const [staff, setStaff] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [tempPasswordResult, setTempPasswordResult] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function loadStaff() {
    accountsApi.listStaffAccounts().then(setStaff).catch(() => setStaff([]));
  }

  useEffect(loadStaff, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await accountsApi.createStaffAccount(form);
      setForm(emptyForm);
      loadStaff();
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Could not create admin account.');
    } finally {
      setCreating(false);
    }
  }

  async function handleResetPassword(staffId) {
    setBusyId(staffId);
    try {
      const result = await accountsApi.resetStaffPassword(staffId);
      setTempPasswordResult({ staffId, password: result.temp_password });
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatus(staffId, statusValue) {
    setBusyId(staffId);
    try {
      await accountsApi.setStaffAccountStatus(staffId, statusValue);
      loadStaff();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const staffId = deleteTarget;
    setDeleteTarget(null);
    setBusyId(staffId);
    try {
      await accountsApi.deleteStaffAccount(staffId);
      loadStaff();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardLayout title="System Access & Role Management">
      <section style={{ display: 'grid', gap: '2rem' }}>
        <article className="card overview-card">
          <div className="card-header"><h3>Create Specialized Admin</h3></div>
          <div className="card-content">
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input className="form-control" value={form.first_name} onChange={update('first_name')} required />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input className="form-control" value={form.last_name} onChange={update('last_name')} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input className="form-control" value={form.username} onChange={update('username')} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={update('email')} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-control" value={form.role} onChange={update('role')} required>
                    <option value="">-- Select Role --</option>
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Temporary Password</label>
                  <input className="form-control" value={form.temp_password} onChange={update('temp_password')} required />
                </div>
              </div>

              {error && <p className="form-error-banner">{error}</p>}

              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create Admin Account'}
              </button>
            </form>
          </div>
        </article>

        <article className="card overview-card">
          <div className="card-header"><h3>Active Administrator Directory</h3></div>
          <div className="card-content" style={{ overflowX: 'auto' }}>
            {!staff && <p className="loading-state">Loading…</p>}
            {staff && staff.length === 0 && <p className="empty-state">No staff accounts yet.</p>}
            {staff && staff.length > 0 && (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Administrator</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Role</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Status</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((account) => (
                    <tr key={account.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{account.full_name || account.username}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{ROLE_LABELS[account.role] || account.role}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span className="status-pill">{account.account_status}</span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <button className="action-btn btn-reset" disabled={busyId === account.id}
                          onClick={() => handleResetPassword(account.id)}>Reset Pass</button>
                        {account.account_status === 'active'
                          ? <button className="action-btn btn-delete" disabled={busyId === account.id}
                              onClick={() => handleStatus(account.id, 'suspended')}>Revoke</button>
                          : <button className="action-btn btn-edit" disabled={busyId === account.id}
                              onClick={() => handleStatus(account.id, 'active')}>Reactivate</button>}
                        <button className="action-btn btn-delete" disabled={busyId === account.id}
                          onClick={() => setDeleteTarget(account.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tempPasswordResult && (
              <p style={{ marginTop: '1rem', color: '#2be7b6' }}>
                New temporary password: <strong>{tempPasswordResult.password}</strong> — share this with the admin securely.
              </p>
            )}
          </div>
        </article>
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete admin account"
        message="Permanently delete this admin account? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
}
