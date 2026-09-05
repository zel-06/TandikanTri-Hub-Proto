import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import * as dashboardApi from '../../api/dashboard';

export default function Overview() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    dashboardApi.getDashboardSummary().then(setSummary).catch(() => {});
  }, []);

  const kpis = [];
  if (summary?.overview) {
    kpis.push(
      { label: 'Active Users', value: summary.overview.active_users },
      { label: 'Total Revenue', value: `₱${Number(summary.overview.total_revenue).toLocaleString()}` },
      { label: 'Race Registrations', value: summary.overview.race_registrations },
      { label: 'Staff Admins', value: summary.overview.staff_admins },
    );
  } else {
    if (summary?.events) {
      kpis.push(
        { label: 'Published Events', value: summary.events.published_events },
        { label: 'Total Events', value: summary.events.total_events },
      );
    }
    if (summary?.finance) {
      kpis.push(
        { label: 'Total Revenue', value: `₱${Number(summary.finance.total_revenue).toLocaleString()}` },
        { label: 'Pending Payments', value: summary.finance.pending_payments },
      );
    }
    if (summary?.users) {
      kpis.push(
        { label: 'Active Users', value: summary.users.active_users },
        { label: 'Pending ID Verifications', value: summary.users.pending_id_verifications },
        { label: 'Suspended Accounts', value: summary.users.suspended_accounts },
      );
    }
  }

  return (
    <DashboardLayout title="Analytics & Overview" eyebrow="Dashboard">
      <section className="kpi-section">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <p className="kpi-title">{kpi.label}</p>
            <h3>{kpi.value}</h3>
          </article>
        ))}
      </section>

      {summary?.events?.category_performance?.length > 0 && (
        <article className="card">
          <div className="card-header">
            <div>
              <h3>Event Performance</h3>
              <p>Fill rate by category.</p>
            </div>
          </div>
          <div className="card-content" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Event</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Category</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Fill Rate</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Participants</th>
                </tr>
              </thead>
              <tbody>
                {summary.events.category_performance.map((row) => (
                  <tr key={`${row.event}-${row.category}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{row.event}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{row.category}</td>
                    <td style={{ padding: '1rem 0.5rem', color: row.fill_rate >= 90 ? '#ff6d79' : '#2be7b6', fontWeight: 700 }}>
                      {row.fill_rate}%
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>{row.filled_slots}/{row.total_slots}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {summary?.recent_audit?.length > 0 && (
        <article className="card alerts-card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="alert-list">
            {summary.recent_audit.map((entry, i) => (
              <div className="alert-item" key={i}>
                <div className="alert-info">
                  <div>
                    <p className="alert-title">{entry.action}</p>
                    <p className="alert-meta">{entry.target_description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {!summary && <p className="loading-state">Loading overview…</p>}
    </DashboardLayout>
  );
}
