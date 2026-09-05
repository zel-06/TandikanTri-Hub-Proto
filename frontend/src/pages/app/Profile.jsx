import { useEffect, useState } from 'react';
import AuthNavbar from '../../components/AuthNavbar';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/auth';
import * as registrationsApi from '../../api/registrations';

const VERIFICATION_LABEL = {
  unsubmitted: 'No ID submitted',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected — please re-upload',
};

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [registrations, setRegistrations] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name, last_name: user.last_name, email: user.email,
        phone: user.phone, street: user.street, city: user.city,
        barangay: user.barangay, province: user.province, postal_code: user.postal_code,
      });
    }
  }, [user]);

  useEffect(() => {
    registrationsApi.listMyRegistrations().then(setRegistrations).catch(() => setRegistrations([]));
  }, []);

  if (!user || !form) return null;

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavedMessage('');
    setSaveError('');
    try {
      const data = idFile ? new FormData() : { ...form };
      if (idFile) {
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        data.append('id_document', idFile);
      }
      await authApi.updateMe(data);
      await refreshProfile();
      setIdFile(null);
      setSavedMessage('Profile updated.');
    } catch (err) {
      setSaveError(JSON.stringify(err.response?.data) || 'Could not update profile.');
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    try {
      await authApi.changePassword(passwordForm);
      setPasswordForm({ current_password: '', new_password: '' });
      setPasswordMessage('Password changed.');
    } catch (err) {
      setPasswordError(JSON.stringify(err.response?.data) || 'Could not change password.');
    }
  }

  return (
    <>
      <AuthNavbar />
      <main className="section">
        <div className="section-content">
          <h2 className="section-title">Profile Settings</h2>

          <article className="card">
            <div className="card-header"><h3>Personal Information</h3></div>
            <div className="card-content">
              <form onSubmit={handleSaveProfile}>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input className="form-control" value={form.first_name}
                      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input className="form-control" value={form.last_name}
                      onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input className="form-control" value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Street</label>
                    <input className="form-control" value={form.street}
                      onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input className="form-control" value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Barangay</label>
                    <input className="form-control" value={form.barangay}
                      onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Province</label>
                    <input className="form-control" value={form.province}
                      onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
                  </div>
                </div>

                {user.role === 'athlete' && (
                  <div className="form-group">
                    <label>ID Verification: {VERIFICATION_LABEL[user.id_verification_status]}</label>
                    {(user.id_verification_status === 'unsubmitted' || user.id_verification_status === 'rejected') && (
                      <input type="file" accept="image/*" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                    )}
                  </div>
                )}

                {saveError && <p className="form-error-banner">{saveError}</p>}
                {savedMessage && <p style={{ color: '#2be7b6' }}>{savedMessage}</p>}
                <button className="btn btn-primary" type="submit">Save Changes</button>
              </form>
            </div>
          </article>

          <article className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header"><h3>Change Password</h3></div>
            <div className="card-content">
              <form onSubmit={handleChangePassword}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input className="form-control" type="password" value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input className="form-control" type="password" value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))} required />
                  </div>
                </div>
                {passwordError && <p className="form-error-banner">{passwordError}</p>}
                {passwordMessage && <p style={{ color: '#2be7b6' }}>{passwordMessage}</p>}
                <button className="btn btn-secondary" type="submit">Change Password</button>
              </form>
            </div>
          </article>

          <article className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header"><h3>My Registrations</h3></div>
            <div className="card-content" style={{ overflowX: 'auto' }}>
              {registrations === null && <p className="loading-state">Loading…</p>}
              {registrations && registrations.length === 0 && <p className="empty-state">No registrations yet.</p>}
              {registrations && registrations.length > 0 && (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#1e293b', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Event</th>
                      <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Category</th>
                      <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Bib #</th>
                      <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{reg.event_category.event_title}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{reg.event_category.name}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{reg.bib_number || '—'}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{reg.status.replace('_', ' ')}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{reg.payment?.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
