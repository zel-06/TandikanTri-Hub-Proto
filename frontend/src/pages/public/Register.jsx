import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MinimalNavbar from '../../components/MinimalNavbar';
import Footer from '../../components/Footer';
import * as authApi from '../../api/auth';
import logo from '../../assets/images/logo.png';
import uploadIcon from '../../assets/images/upload_id.png';

const initialForm = {
  first_name: '', last_name: '', username: '', email: '', phone: '',
  street: '', city: '', barangay: '', province: '', postal_code: '',
  birthdate: '', password: '', password_confirm: '', guardian_consent_name: '',
};

const STEP_LABELS = ['Contact & Verification', 'Personal Details', 'Terms & Privacy'];

const STEP1_FIELDS = ['first_name', 'last_name', 'username', 'email', 'phone', 'email_verification_token'];
const STEP2_FIELDS = [
  'street', 'city', 'barangay', 'province', 'postal_code', 'birthdate',
  'password', 'password_confirm', 'id_document', 'guardian_id_document', 'guardian_consent_name',
];

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

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { level: 1, label: 'Weak' };
  if (score <= 3) return { level: 2, label: 'Fair' };
  if (score <= 5) return { level: 3, label: 'Strong' };
  return { level: 4, label: 'Very Strong' };
}

function isPasswordValid(password, username, email) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  if (username && password.toLowerCase() === username.toLowerCase()) return false;
  if (email && password.toLowerCase() === email.toLowerCase()) return false;
  return true;
}

function Stepper({ currentStep }) {
  return (
    <div className="register-steps register-steps-3">
      {STEP_LABELS.map((label, i) => {
        const stepNumber = i + 1;
        const complete = stepNumber < currentStep;
        const active = stepNumber === currentStep;
        return (
          <div key={label} className={`step${active ? ' active' : ''}${complete ? ' complete' : ''}`}>
            <span>{complete ? '✓' : stepNumber}</span>
            <p>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [idFile, setIdFile] = useState(null);
  const [guardianIdFile, setGuardianIdFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificationToken, setVerificationToken] = useState(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsScrolledToBottom, setTermsScrolledToBottom] = useState(false);
  const termsBoxRef = useRef(null);

  const age = calculateAge(form.birthdate);
  const isMinor = age !== '' && age < 18;
  const passwordStrength = getPasswordStrength(form.password);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 3 && termsBoxRef.current) {
      const el = termsBoxRef.current;
      if (el.scrollHeight <= el.clientHeight + 8) {
        setTermsScrolledToBottom(true);
      }
    }
  }, [step]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updateEmail(e) {
    const value = e.target.value;
    setForm((f) => ({ ...f, email: value }));
    if (otpSent || otpVerified) {
      setOtpSent(false);
      setOtpVerified(false);
      setVerificationToken(null);
      setOtpCode('');
    }
  }

  function handlePostalCodeChange(e) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setForm((f) => ({ ...f, postal_code: digitsOnly }));
  }

  function handlePhoneNumberChange(e) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm((f) => ({ ...f, phone: digitsOnly }));
  }

  async function handleSendCode() {
    setErrors({});
    setSendingCode(true);
    try {
      const res = await authApi.sendVerificationCode(form.email);
      setOtpSent(true);
      setOtpCode('');
      setCooldown(res.cooldown_seconds || 60);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Something went wrong. Please try again.' });
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    setErrors({});
    setVerifyingCode(true);
    try {
      const res = await authApi.verifyEmailCode(form.email, otpCode);
      setVerificationToken(res.verification_token);
      setOtpVerified(true);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Something went wrong. Please try again.' });
    } finally {
      setVerifyingCode(false);
    }
  }

  function handleStep1Submit(e) {
    e.preventDefault();
    if (!otpSent) {
      handleSendCode();
    } else if (!otpVerified) {
      handleVerifyCode();
    } else {
      setStep(2);
    }
  }

  function handleStep2Next(e) {
    e.preventDefault();
    const newErrors = {};
    if (form.password !== form.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match.';
    } else if (!isPasswordValid(form.password, form.username, form.email)) {
      newErrors.password = 'Password must be at least 8 characters and include an uppercase letter, '
        + 'a lowercase letter, a number, and a special character, and cannot match your username or email.';
    }
    if (!idFile) newErrors.id_document = 'Please upload a valid ID.';
    if (isMinor) {
      if (!guardianIdFile) {
        newErrors.guardian_id_document = 'A guardian or parent ID is required for applicants below 18 years old.';
      }
      if (!form.guardian_consent_name.trim()) {
        newErrors.guardian_consent_name = "The parent or guardian's typed full name is required as consent.";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setStep(3);
  }

  function handleTermsScroll(e) {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setTermsScrolledToBottom(true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!termsAccepted || !privacyAccepted) return;

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (idFile) data.append('id_document', idFile);
      if (guardianIdFile) data.append('guardian_id_document', guardianIdFile);
      data.append('email_verification_token', verificationToken || '');
      data.append('terms_accepted', termsAccepted);
      data.append('privacy_accepted', privacyAccepted);

      await authApi.register(data);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const responseErrors = err.response?.data || { non_field: 'Something went wrong. Please try again.' };
      setErrors(responseErrors);
      const keys = Object.keys(responseErrors);
      if (keys.some((k) => STEP1_FIELDS.includes(k))) {
        setStep(1);
        if (responseErrors.email_verification_token) {
          setOtpSent(false);
          setOtpVerified(false);
          setVerificationToken(null);
          setOtpCode('');
        }
      } else if (keys.some((k) => STEP2_FIELDS.includes(k))) {
        setStep(2);
      }
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

          <Stepper currentStep={step} />

          {step === 1 && (
            <form className="create-account-form" onSubmit={handleStep1Submit}>
              <label className="login-info-title">Name</label>
              <label className="input-group">
                <input type="text" placeholder="first name" value={form.first_name} onChange={update('first_name')} required />
              </label>
              <label className="input-group">
                <input type="text" placeholder="last name" value={form.last_name} onChange={update('last_name')} required />
              </label>

              <label className="login-info-title">Username</label>
              <label className="input-group full-width">
                <input type="text" placeholder="username" value={form.username} onChange={update('username')} required />
              </label>
              {errors.username && <p className="field-error">{errors.username}</p>}

              <label className="login-info-title">Email</label>
              <label className="input-group full-width">
                <input
                  type="email"
                  placeholder="email address"
                  value={form.email}
                  onChange={updateEmail}
                  disabled={otpSent}
                  required
                />
              </label>
              {errors.email && <p className="field-error">{errors.email}</p>}

              <label className="login-info-title">Phone</label>
              <label className="input-group full-width">
                <input type="tel" inputMode="search" placeholder="phone number" value={form.phone} onChange={handlePhoneNumberChange} required />
              </label>

              {otpSent && (
                <div className="otp-section">
                  <label className="login-info-title">Verification Code</label>
                  <label className="input-group otp-input">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="6-digit code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={otpVerified}
                      required
                    />
                  </label>
                  {errors.code && <p className="field-error">{errors.code}</p>}

                  {otpVerified ? (
                    <p className="otp-verified"><span className="agreement-check">✓</span> Email verified</p>
                  ) : (
                    <div className="otp-actions">
                      <span className="otp-hint">Code sent to {form.email}. It expires in 5 minutes.</span>
                      <button
                        type="button"
                        className="link-button"
                        disabled={cooldown > 0 || sendingCode}
                        onClick={handleSendCode}
                      >
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errors.non_field && <p className="field-error">{errors.non_field}</p>}

              <button className="btn btn-primary login-submit" type="submit" disabled={sendingCode || verifyingCode}>
                {!otpSent
                  ? (sendingCode ? 'Sending code…' : 'Send Verification Code')
                  : !otpVerified
                    ? (verifyingCode ? 'Verifying…' : 'Verify Code')
                    : 'Next'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="create-account-form" onSubmit={handleStep2Next}>
              <label className="login-info-title">Address</label>
              <label className="input-group full-width">
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

              <div className="password-strength full-width">
                <div className="password-strength-bars">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={`bar level-${passwordStrength.level >= i ? passwordStrength.level : 0}`} />
                  ))}
                </div>
                <p className="password-strength-label">
                  {passwordStrength.label || 'Use at least 8 characters (12+ recommended) with uppercase, lowercase, a number, and a special character.'}
                </p>
              </div>
              {errors.password && <p className="field-error">{errors.password}</p>}
              {errors.password_confirm && <p className="field-error">{errors.password_confirm}</p>}

              <div className="upload-section">
                <label>Upload ID</label>
                <p className="login-subtitle" style={{ margin: '0 0 0.5rem' }}>Accepted formats: JPG or PNG, max 5MB.</p>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id="IDverification"
                    accept="image/png,image/jpeg"
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
                      accept="image/png,image/jpeg"
                      onChange={(e) => setGuardianIdFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="guardianIDverification" className="file-input-label">
                      <img src={uploadIcon} alt="upload icon" className="input-icon" />
                      <span>{guardianIdFile ? guardianIdFile.name : 'Choose file'}</span>
                    </label>
                  </div>
                  {errors.guardian_id_document && <p className="field-error">{errors.guardian_id_document}</p>}

                  <div className="consent-box">
                    <p>
                      I am the parent or legal guardian of the applicant named above. I have read and understood the
                      Data Privacy Policy, and I consent to the collection and processing of my child&apos;s personal
                      information for event registration, safety, and communication purposes.
                    </p>
                    <label className="login-info-title">Guardian&apos;s Full Name (e-signature)</label>
                    <label className="input-group">
                      <input
                        type="text"
                        placeholder="type full name to sign"
                        value={form.guardian_consent_name}
                        onChange={update('guardian_consent_name')}
                      />
                    </label>
                    {errors.guardian_consent_name && <p className="field-error">{errors.guardian_consent_name}</p>}
                  </div>
                </div>
              )}

              {errors.non_field && <p className="field-error">{errors.non_field}</p>}

              <div className="step-actions full-width">
                <button className="btn btn-outline" type="button" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary login-submit" type="submit">Next</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="create-account-form" onSubmit={handleSubmit}>
              <div className="terms-box" ref={termsBoxRef} onScroll={handleTermsScroll}>
                <h3>Terms and Conditions</h3>
                <p>
                  By creating an account with Tandikan Tri Team, you agree to provide accurate registration
                  and identification details, to use this platform only for legitimate event registration and
                  participation, and to follow the rules, schedules, and policies set by the organizers for any
                  event you join. Accounts found to contain false information or used for fraudulent registration
                  may be suspended or terminated.
                </p>
                <h3>Privacy Policy</h3>
                <p>
                  In compliance with the Data Privacy Act of 2012 (RA 10173), Tandikan Tri Team collects and
                  processes the personal information and identification documents you submit solely for account
                  verification, event registration, safety, and communication purposes. Your data will not be
                  shared with third parties without your consent, except as required by law or race safety
                  protocols. You may request access to, correction of, or deletion of your personal data by
                  contacting the organizers.
                </p>
              </div>
              {!termsScrolledToBottom && (
                <p className="terms-scroll-hint">Scroll to the end of the box above to enable the checkboxes below.</p>
              )}

              <div className="checkbox-field">
                <label>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    disabled={!termsScrolledToBottom}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span>I have read and agree to the Terms and Conditions.</span>
                </label>
              </div>
              {errors.terms_accepted && <p className="field-error">{errors.terms_accepted}</p>}

              <div className="checkbox-field">
                <label>
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    disabled={!termsScrolledToBottom}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  />
                  <span>I have read and agree to the Privacy Policy.</span>
                </label>
              </div>
              {errors.privacy_accepted && <p className="field-error">{errors.privacy_accepted}</p>}

              {errors.non_field && <p className="field-error">{errors.non_field}</p>}

              <div className="step-actions full-width">
                <button className="btn btn-outline" type="button" onClick={() => setStep(2)}>Back</button>
                <button
                  className="btn btn-primary login-submit"
                  type="submit"
                  disabled={submitting || !termsAccepted || !privacyAccepted}
                >
                  {submitting ? 'Creating account…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <div className="login-footer">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
