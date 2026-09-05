import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MinimalNavbar from '../../components/MinimalNavbar';
import Footer from '../../components/Footer';
import * as authApi from '../../api/auth';
import logo from '../../assets/images/logo.png';
import uploadIcon from '../../assets/images/upload_id.png';

const initialForm = {
  first_name: '', last_name: '', username: '', email: '', phone: '',
  street: '', city: '', barangay: '', province: '', postal_code: '',
  password: '', password_confirm: '',
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [idFile, setIdFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (idFile) data.append('id_document', idFile);
      await authApi.register(data);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <MinimalNavbar />

      <main className="login-main">
        <section className="create-account-card">
          <div className="login-logo">
            <img src={logo} alt="Tandikan Tri Team Logo" />
          </div>
          <h1>Create your account</h1>
          <p className="login-subtitle">Register to access the full Tandikan Tri-Hub experience.</p>

          <form className="create-account-form" onSubmit={handleSubmit}>
            <label className="login-info-title">Name</label>
            <label className="input-group">
              <input type="text" placeholder="first name" value={form.first_name} onChange={update('first_name')} required />
            </label>
            <label className="input-group">
              <input type="text" placeholder="last name" value={form.last_name} onChange={update('last_name')} required />
            </label>

            <label className="login-info-title">Username</label>
            <label className="input-group">
              <input type="text" placeholder="username" value={form.username} onChange={update('username')} required />
            </label>
            {errors.username && <p className="field-error">{errors.username}</p>}

            <label className="login-info-title">Email</label>
            <label className="input-group">
              <input type="email" placeholder="email address" value={form.email} onChange={update('email')} required />
            </label>
            {errors.email && <p className="field-error">{errors.email}</p>}

            <label className="login-info-title">Phone</label>
            <label className="input-group">
              <input type="tel" placeholder="phone number" value={form.phone} onChange={update('phone')} required />
            </label>

            <label className="login-info-title">Address</label>
            <label className="input-group">
              <input type="text" placeholder="street" value={form.street} onChange={update('street')} required />
            </label>
            <label className="input-group">
              <input type="text" placeholder="city" value={form.city} onChange={update('city')} required />
            </label>
            <label className="input-group">
              <input type="text" placeholder="barangay" value={form.barangay} onChange={update('barangay')} required />
            </label>
            <label className="input-group">
              <input type="text" placeholder="province" value={form.province} onChange={update('province')} required />
            </label>
            <label className="input-group">
              <input type="text" placeholder="postal code" value={form.postal_code} onChange={update('postal_code')} required />
            </label>

            <label className="login-info-title">Password</label>
            <label className="input-group">
              <input type="password" placeholder="Password" value={form.password} onChange={update('password')} required />
            </label>
            <label className="input-group">
              <input type="password" placeholder="Confirm password" value={form.password_confirm} onChange={update('password_confirm')} required />
            </label>
            {errors.password && <p className="field-error">{errors.password}</p>}
            {errors.password_confirm && <p className="field-error">{errors.password_confirm}</p>}

            <div className="upload-section">
              <label>Upload ID</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="IDverification"
                  accept="image/*"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="IDverification" className="file-input-label">
                  <img src={uploadIcon} alt="upload icon" className="input-icon" />
                  <span>{idFile ? idFile.name : 'Choose file'}</span>
                </label>
              </div>
            </div>

            {errors.non_field && <p className="field-error">{errors.non_field}</p>}

            <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="login-footer">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
