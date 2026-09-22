import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthNavbar from '../../components/AuthNavbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../roles';
import * as authApi from '../../api/auth';
import * as registrationsApi from '../../api/registrations';
import logo from '../../assets/images/logo.png';

const VERIFICATION_LABEL = {
  unsubmitted: 'No ID submitted',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected — please re-upload',
};

export default function Profile() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [guardianIdFile, setGuardianIdFile] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username, first_name: user.first_name, last_name: user.last_name, email: user.email,
        phone: user.phone, street: user.street, city: user.city,
        barangay: user.barangay, province: user.province, postal_code: user.postal_code,
      });
    }
  }, [user]);

  useEffect(() => {
    registrationsApi.listMyRegistrations().then(setRegistrations).catch(() => setRegistrations([]));
  }, []);

  if (!user || !form) return null;

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append('profile_picture', file);
      await authApi.updateMe(data);
      await refreshProfile();
    } catch {
      setPhotoError('Could not update profile picture.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavedMessage('');
    setSaveError('');
    try {
      const hasFile = idFile || guardianIdFile;
      const data = hasFile ? new FormData() : { ...form };
      if (hasFile) {
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        if (idFile) data.append('id_document', idFile);
        if (guardianIdFile) data.append('guardian_id_document', guardianIdFile);
      }
      await authApi.updateMe(data);
      await refreshProfile();
      setIdFile(null);
      setGuardianIdFile(null);
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

  async function handleDeleteAccount() {
    setDeleteError('');
    setDeleting(true);
    try {
      await authApi.deleteMe(deletePassword);
      setConfirmingDelete(false);
      logout();
      navigate('/', { state: { accountDeleted: true } });
    } catch (err) {
      setConfirmingDelete(false);
      setDeleteError(err.response?.data?.password || 'Could not delete account.');
    } finally {
      setDeleting(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <AuthNavbar />
      <main className="section">
        <div className="section-content">
          <h2 className="section-title">User Profile</h2>

          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <label htmlFor="profilePictureInput" style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
              <img
                src={user.profile_picture || logo}
                alt="Profile"
                style={{
                  width: 120, height: 120, borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid #e2e8f0', background: '#f8fafc',
                }}
              />
              <span
                style={{
                  position: 'absolute', bottom: 2, right: 2, background: '#2563eb', color: '#ffffff',
                  borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.9rem', border: '2px solid #ffffff',
                }}
                title="Change photo"
              >
                ✎
              </span>
            </label>
            <input
              id="profilePictureInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            {uploadingPhoto && <p className="loading-state" style={{ margin: '0.5rem 0 0' }}>Uploading…</p>}
            {photoError && <p className="form-error-banner" style={{ marginTop: '0.5rem', display: 'inline-block' }}>{photoError}</p>}

            <h3 style={{ margin: '0.75rem 0 0.15rem' }}>{user.username}</h3>
            <p style={{ color: '#64748b', margin: 0 }}>{user.email}</p>

            <br />

            {user.role !== ROLES.ATHLETE && (
              <div style={{ marginTop: '1rem' }}>
                <Link to="/dashboard/overview" className="btn btn-outline">Admin Panel</Link>
              </div>
            )}
          </div>

          <article className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header"><h3>Personal Information</h3></div>
            <div className="card-content">
              <form onSubmit={handleSaveProfile}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Username</label>
                    <input className="form-control" value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
                  </div>
                </div>
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
                    {user.is_minor && (user.id_verification_status === 'unsubmitted' || user.id_verification_status === 'rejected') && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <label>Guardian/Parent ID</label>
                        <input type="file" accept="image/*" onChange={(e) => setGuardianIdFile(e.target.files?.[0] || null)} />
                      </div>
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

          <article
            className="card"
            style={{ marginTop: '1.5rem', border: '1px solid rgba(255, 109, 121, 0.35)', maxWidth: '480px' }}
          >
            <div className="card-content" style={{ padding: '1.1rem' }}>
              <h4 style={{ color: '#dc2626', margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Danger Zone</h4>
              <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                Deleting your account is permanent. Your username and email will be freed up for a new
                account, but your event registrations and payment history will be kept for our records.
              </p>
              <div className="form-group" style={{ maxWidth: '240px' }}>
                <label style={{ fontSize: '0.8rem' }}>Enter your password to confirm</label>
                <input
                  className="form-control"
                  type="password"
                  style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
              {deleteError && <p className="form-error-banner" style={{ fontSize: '0.8rem' }}>{deleteError}</p>}
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#ffffff', padding: '0.55rem 1.1rem', fontSize: '0.8rem' }}
                type="button"
                disabled={!deletePassword || deleting}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete My Account
              </button>
            </div>
          </article>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setConfirmingLogout(true)}>
              Log Out
            </button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirmingDelete}
        theme="light"
        title="Delete your account?"
        message="This cannot be undone. Your username and email will become available for a new account, but your event registration and payment history will be kept."
        confirmLabel={deleting ? 'Deleting…' : 'Delete My Account'}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ConfirmDialog
        open={confirmingLogout}
        theme="light"
        title="Log out?"
        message="You will need to log in again to access your account."
        confirmLabel="Log Out"
        onConfirm={handleLogout}
        onCancel={() => setConfirmingLogout(false)}
      />

      <Footer />
    </>
  );
}
