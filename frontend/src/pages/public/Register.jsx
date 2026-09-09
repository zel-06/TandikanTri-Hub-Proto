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
  birthdate: '', password: '', password_confirm: '',
};

function calculateAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [idFile, setIdFile] = useState(null);
  const [guardianIdFile, setGuardianIdFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const age = calculateAge(form.birthdate);
  const isMinor = age !== '' && age < 18;

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handlePostalCodeChange(e) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setForm((f) => ({ ...f, postal_code: digitsOnly }));
  }

  function handlePhoneNumberChange(e) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm((f) => ({ ...f, phone: digitsOnly }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!idFile) newErrors.id_document = 'Please upload a valid ID.';
    if (isMinor && !guardianIdFile) {
      newErrors.guardian_id_document = 'A guardian or parent ID is required for applicants below 18 years old.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (idFile) data.append('id_document', idFile);
      if (guardianIdFile) data.append('guardian_id_document', guardianIdFile);
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
              <input type="tel" inputMode="search" placeholder="phone number" value={form.phone} onChange={handlePhoneNumberChange} required />
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
              <input type="text" inputMode="numeric" placeholder="postal code" value={form.postal_code} onChange={handlePostalCodeChange} required />
            </label>

            <label className="login-info-title">Birthdate</label>
            <label className="input-group">
              <input type="date" value={form.birthdate} onChange={update('birthdate')} required />
            </label>
            <label className="input-group">
              <input type="text" value={age === '' ? '' : `Age: ${age}`} readOnly placeholder="Age" />
            </label>
            {errors.birthdate && <p className="field-error">{errors.birthdate}</p>}

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
            {errors.id_document && <p className="field-error">{errors.id_document}</p>}

            {isMinor && (
              <div className="upload-section">
                <label>Upload Guardian/Parent ID</label>
                <p className="login-subtitle" style={{ margin: '0 0 0.5rem' }}>
                  Since you are below 18, please also upload a valid ID of your parent or guardian.
                </p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id="guardianIDverification"
                    accept="image/*"
                    onChange={(e) => setGuardianIdFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="guardianIDverification" className="file-input-label">
                    <img src={uploadIcon} alt="upload icon" className="input-icon" />
                    <span>{guardianIdFile ? guardianIdFile.name : 'Choose file'}</span>
                  </label>
                </div>
              </div>
            )}
            {errors.guardian_id_document && <p className="field-error">{errors.guardian_id_document}</p>}

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
