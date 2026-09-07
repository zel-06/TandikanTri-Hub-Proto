import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import * as registrationsApi from '../../api/registrations';

export default function Finance() {
  const [report, setReport] = useState(null);
  const [recentPayments, setRecentPayments] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);

  function loadAll() {
    registrationsApi.getFinanceReport().then(setReport).catch(() => {});
    registrationsApi.listPaymentQueue('verified').then(setRecentPayments).catch(() => {});
    registrationsApi.listPaymentQueue('pending').then((rows) => setPendingCount(rows.length)).catch(() => {});
  }

  useEffect(loadAll, []);

  return (
    <DashboardLayout
      title="Finance & Revenue Management"
      actions={
        <button className="btn btn-primary" onClick={() => registrationsApi.exportFinanceReport()}>
          Generate &amp; Export Report
        </button>
      }
    >
      <section className="kpi-section">
        <article className="kpi-card">
          <p className="kpi-title">Total Revenue</p>
          <h3>₱{Number(report?.total_revenue || 0).toLocaleString()}</h3>
          <span className="kpi-metric">Verified Payments</span>
        </article>
        <article className="kpi-card">
          <p className="kpi-title">Registration Revenue</p>
          <h3>₱{Number(report?.total_revenue || 0).toLocaleString()}</h3>
          <span className="kpi-metric">{report?.verified_payment_count || 0} confirmed</span>
        </article>
        <article className="kpi-card">
          <p className="kpi-title">Awaiting Payment</p>
          <h3>{pendingCount ?? '—'}</h3>
          <span className="kpi-metric">Registered, not yet paid</span>
        </article>
      </section>

      <article className="card overview-card">
        <div className="card-header">
          <div>
            <h3>Recent Payments</h3>
            <p>All payments are verified automatically by PayMongo — no manual action needed.</p>
          </div>
        </div>
        <div className="card-content" style={{ overflowX: 'auto' }}>
          {!recentPayments && <p className="loading-state">Loading…</p>}
          {recentPayments && recentPayments.length === 0 && <p className="empty-state">No payments yet.</p>}
          {recentPayments && recentPayments.length > 0 && (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Registration</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Method</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Amount</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Verified At</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>#{payment.id}</td>
                    <td style={{ padding: '1rem 0.5rem', textTransform: 'capitalize' }}>{payment.method || '—'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>₱{Number(payment.amount).toLocaleString()}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {payment.verified_at ? new Date(payment.verified_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </article>

      {report?.by_event?.length > 0 && (
        <article className="card overview-card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header"><h3>Revenue by Event</h3></div>
          <div className="card-content" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Event</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Registrations</th>
                  <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {report.by_event.map((row) => (
                  <tr key={row.event} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{row.event}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{row.registrations}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>₱{Number(row.revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </DashboardLayout>
  );
}
