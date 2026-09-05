import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import * as accountsApi from '../../api/accounts';

export default function UserManagement() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [busyId, setBusyId] = useState(null);

  function loadUsers() {
    accountsApi.listUsers({
      search: search || undefined,
      verification_status: verificationFilter || undefined,
    }).then(setUsers).catch(() => setUsers([]));
  }

  useEffect(loadUsers, [search, verificationFilter]);

  async function handleVerify(userId, decision) {
    setBusyId(userId);
    try {
      await accountsApi.verifyUserId(userId, decision);
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccountStatus(userId, statusValue) {
    setBusyId(userId);
    try {
      await accountsApi.setUserAccountStatus(userId, statusValue);
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = users?.filter((u) => u.id_verification_status === 'pending').length ?? 0;

  return (
    <DashboardLayout
      title="User Management"
      actions={<button className="btn btn-secondary" onClick={() => accountsApi.exportUsers()}>Export User Base</button>}
    >
      <section className="kpi-section">
        <article className="kpi-card">
          <p className="kpi-title">Pending Verifications</p>
          <h3>{pendingCount}</h3>
        </article>
        <article className="kpi-card">
          <p className="kpi-title">Total Athletes</p>
          <h3>{users?.length ?? '—'}</h3>
        </article>
      </section>

      <article className="card overview-card">
        <div className="card-header">
          <div>
            <h3>User Profiles &amp; Verification</h3>
            <p>Search, verify identity documents, and manage account status.</p>
          </div>
        </div>
        <div className="card-content">
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              className="form-control"
              placeholder="Search by name, username, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="form-control" value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)}>
              <option value="">All Verification Statuses</option>
              <option value="unsubmitted">Unsubmitted</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {!users && <p className="loading-state">Loading…</p>}
          {users && users.length === 0 && <p className="empty-state">No matching users.</p>}
          {users && users.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Name</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Email</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>ID Verification</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Account Status</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{user.full_name || user.username}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{user.email}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span className="status-pill">{user.id_verification_status}</span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>{user.account_status}</td>
                      <td style={{ padding: '1rem 0.5rem', whiteSpace: 'nowrap' }}>
                        {user.id_verification_status === 'pending' && (
                          <>
                            <button className="action-btn btn-edit" disabled={busyId === user.id}
                              onClick={() => handleVerify(user.id, 'approved')}>Approve</button>
                            <button className="action-btn btn-delete" disabled={busyId === user.id}
                              onClick={() => handleVerify(user.id, 'rejected')}>Reject</button>
                          </>
                        )}
                        {user.account_status === 'active'
                          ? <button className="action-btn btn-delete" disabled={busyId === user.id}
                              onClick={() => handleAccountStatus(user.id, 'suspended')}>Suspend</button>
                          : <button className="action-btn btn-edit" disabled={busyId === user.id}
                              onClick={() => handleAccountStatus(user.id, 'active')}>Reactivate</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </article>
    </DashboardLayout>
  );
}
