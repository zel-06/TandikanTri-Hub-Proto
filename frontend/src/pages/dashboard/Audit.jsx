import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import * as auditApi from '../../api/audit';

const MODULES = [
  { value: '', label: 'All Modules' },
  { value: 'events', label: 'Events' },
  { value: 'finance', label: 'Finance' },
  { value: 'users', label: 'Users' },
  { value: 'security', label: 'Security' },
  { value: 'roles', label: 'Roles' },
];

export default function Audit() {
  const [logs, setLogs] = useState(null);
  const [module, setModule] = useState('');

  useEffect(() => {
    auditApi.listAuditLogs({ module: module || undefined }).then(setLogs).catch(() => setLogs([]));
  }, [module]);

  return (
    <DashboardLayout
      title="Security & Audit Trail"
      actions={<button className="btn btn-secondary" onClick={() => auditApi.exportAuditLogs()}>Download Logs (CSV)</button>}
    >
      <article className="card overview-card">
        <div className="card-header">
          <div>
            <h3>Live Admin Activity Logs</h3>
            <p>Actions taken by staff accounts across the system.</p>
          </div>
        </div>
        <div className="card-content">
          <div style={{ marginBottom: '1rem' }}>
            <select className="form-control" style={{ maxWidth: '260px' }} value={module} onChange={(e) => setModule(e.target.value)}>
              {MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {!logs && <p className="loading-state">Loading…</p>}
          {logs && logs.length === 0 && <p className="empty-state">No activity recorded yet.</p>}
          {logs && logs.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Administrator</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Module</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Action</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Details</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{log.actor_name}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span className="status-pill">{log.module}</span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>{log.action}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{log.target_description}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(log.created_at).toLocaleString()}</td>
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
