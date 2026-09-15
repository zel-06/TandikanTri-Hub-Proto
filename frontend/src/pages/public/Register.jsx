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

function getPasswordChecks(password, username, email) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
    {
      label: 'Different from your username/email',
      met: password.length > 0
        && password.toLowerCase() !== (username || '').toLowerCase()
        && password.toLowerCase() !== (email || '').toLowerCase(),
    },
  ];
}

function isPasswordValid(password, username, email) {
  return getPasswordChecks(password, username, email).every((c) => c.met);
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
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);
  const otpCode = otpDigits.join('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsScrolledToBottom, setTermsScrolledToBottom] = useState(false);
  const termsBoxRef = useRef(null);

  const age = calculateAge(form.birthdate);
  const isMinor = age !== '' && age < 18;
  const passwordStrength = getPasswordStrength(form.password);
  const passwordChecks = getPasswordChecks(form.password, form.username, form.email);

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
    setForm((f) => ({ ...f, email: e.target.value }));
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
    if (!form.first_name || !form.last_name || !form.username || !form.phone || !form.email) {
      setErrors({ non_field: 'Please fill in your name, username, phone, and email first.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setSendingCode(true);
    try {
      const res = await authApi.sendVerificationCode(form.email);
      setOtpSent(true);
      setOtpVerified(false);
      setVerificationToken(null);
      setOtpDigits(['', '', '', '', '', '']);
      setCooldown(res.cooldown_seconds || 60);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Something went wrong. Please try again.' });
    } finally {
      setSendingCode(false);
    }
  }

  function handleChangeEmail() {
    setOtpSent(false);
    setOtpVerified(false);
    setVerificationToken(null);
    setOtpDigits(['', '', '', '', '', '']);
    setCooldown(0);
    setErrors({});
  }

  function handleOtpDigitChange(index, e) {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    setOtpDigits((d) => {
      const next = [...d];
      next[index] = char;
      return next;
    });
    if (char && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter' && otpDigits.join('').length === 6) {
      e.preventDefault();
      handleVerifyCode();
    }
  }

  function handleOtpPaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = text.split('');
    while (next.length < 6) next.push('');
    setOtpDigits(next);
    otpRefs.current[Math.min(text.length, 6) - 1]?.focus();
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

  function handleStep1Continue(e) {
    e.preventDefault();
    if (otpVerified) setStep(2);
  }

  function handleStep2Next(e) {
    e.preventDefault();
    const newErrors = {};
    if (form.password !== form.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match.';
    } else if (!isPasswordValid(form.password, form.username, form.email)) {
      newErrors.password = 'Please meet all the password requirements above.';
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
          handleChangeEmail();
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

          <br />

          <Stepper currentStep={step} />

          {step === 1 && (
            <form className="create-account-form" onSubmit={handleStep1Continue}>
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

              <label className="login-info-title">Phone</label>
              <label className="input-group full-width">
                <input type="tel" inputMode="search" placeholder="phone number" value={form.phone} onChange={handlePhoneNumberChange} required />
              </label>

              <label className="login-info-title">Email</label>
              <div className="email-verify-group full-width">
                <label className="input-group">
                  <input
                    type="email"
                    placeholder="email address"
                    value={form.email}
                    onChange={updateEmail}
                    disabled={otpSent}
                    required
                  />
                </label>
                <div className="email-verify-actions">
                  {!otpVerified && (
                    <button
                      type="button"
                      className="btn-small"
                      disabled={sendingCode || (otpSent && cooldown > 0)}
                      onClick={handleSendCode}
                    >
                      {sendingCode
                        ? 'Sending…'
                        : !otpSent
                          ? 'Send Verification Code'
                          : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  )}
                  {otpSent && !otpVerified && (
                    <button type="button" className="link-button" onClick={handleChangeEmail}>
                      Change email
                    </button>
                  )}
                </div>
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              {otpSent && !otpVerified && (
                <div className="otp-section full-width">
                  <label className="login-info-title">Enter the 6-digit code</label>
                  <div className="otp-digit-group" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, i) => (
                      <input
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-digit"
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(i, e)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      />
                    ))}
                  </div>
                  <div className="otp-actions">
                    <span className="otp-hint">Sent to {form.email} · expires in 5 minutes</span>
                    <button
                      type="button"
                      className="btn-small"
                      disabled={verifyingCode || otpCode.length < 6}
                      onClick={handleVerifyCode}
                    >
                      {verifyingCode ? 'Verifying…' : 'Verify Code'}
                    </button>
                  </div>
                  {errors.code && <p className="field-error">{errors.code}</p>}
                </div>
              )}

              {otpVerified && (
                <p className="otp-verified full-width"><span className="agreement-check">✓</span> Email verified</p>
              )}

              {errors.non_field && <p className="field-error">{errors.non_field}</p>}

              <button className="btn btn-primary login-submit" type="submit" disabled={!otpVerified}>
                Next
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
              <label className="input-group password-field">
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={update('password')} required />
                <button type="button" className="link-button password-toggle" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </label>
              <label className="input-group password-field">
                <input type={showPasswordConfirm ? 'text' : 'password'} placeholder="Confirm password" value={form.password_confirm} onChange={update('password_confirm')} required />
                <button type="button" className="link-button password-toggle" onClick={() => setShowPasswordConfirm((v) => !v)}>
                  {showPasswordConfirm ? 'Hide' : 'Show'}
                </button>
              </label>

              <div className="password-strength full-width">
                <div className="password-strength-bars">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={`bar level-${passwordStrength.level >= i ? passwordStrength.level : 0}`} />
                  ))}
                </div>
                {passwordStrength.label && <p className="password-strength-label">{passwordStrength.label}</p>}
                <ul className="password-checklist">
                  {passwordChecks.map((c) => (
                    <li key={c.label} className={c.met ? 'met' : ''}>
                      <span className="check-icon">{c.met ? '✓' : ''}</span>{c.label}
                    </li>
                  ))}
                </ul>
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
            <form className="create-account-form terms-step" onSubmit={handleSubmit}>
              <div className="terms-box" ref={termsBoxRef} onScroll={handleTermsScroll}>
                <h3>Terms and Conditions</h3>
                <p style={{ textAlign: 'justify' }}>
                  <b>By creating an account on Tandikan Tri-Hub, you agree to the following:</b>
                      
                      <br />
                      <b>Account Responsibility</b><br />
                      You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.
                      <br />
                      <b>Accurate Information</b><br />
                      You agree to provide accurate, current, and complete information when creating and maintaining your account.
                      <br />
                      <b>Platform Use</b><br />
                      Tandikan Tri-Hub is provided for the purpose of discovering, registering for, and managing participation in multisport events organized or listed through the platform. You agree not to misuse the platform (e.g., unauthorized access, scraping, impersonation, or disrupting other users' access).
                      <br />
                      <b>Community Feed</b><br />
                      The community feed (announcements, event photos, updates) is posted by Tandikan Tri-Hub admins only. As a user, you may like and share posts, but may not comment on, publish, upload, or submit content to the feed. Any interactions (e.g., likes, shares) must be made in good faith and not used to manipulate engagement or disrupt the platform.
                      <br />
                      <b>Service Availability</b><br />
                      Tandikan Tri-Hub is provided "as is." While we aim for reliable uptime, we do not guarantee uninterrupted access and are not liable for losses arising from platform downtime.
                      <br />
                      <b>Changes to Terms</b><br />
                      These terms may be updated from time to time. Continued use of the platform after changes constitutes acceptance of the revised terms.
                      <br />
                      <b>Governing Law</b><br />
                      These terms are governed by the laws of the Republic of the Philippines.
                </p>
                <h3>Privacy Policy</h3>
                <p style={{ textAlign: 'justify' }}>
                  <b>In compliance with the Data Privacy Act of 2012 (RA 10173), Tandikan Tri-Hub collects and processes the following account-level personal information for the purpose of creating and managing your user account:</b>
                  <br />
                  Full name, email address, and password (encrypted)<br />
                  Profile information you choose to provide (e.g., profile photo, bio)<br />
                  Login and activity data (e.g., login timestamps, device/browser information) for account security purposes
                  
                  <br />
                  <b>How we use this data:</b>
                  <br />
                  To create, authenticate, and manage your account<br />
                  To send account-related notifications (e.g., password resets, registration confirmations)<br />
                  To personalize your experience on the platform (e.g., dashboard, community feed)<br />
                  Data sharing: Your account data will not be sold or shared with third parties for marketing purposes. It may be disclosed only: (a) with your consent, (b) as required by law, or (c) to event organizers only when you register for a specific event, subject to the separate Event Data Privacy Agreement at registration.
                  
                  <br />
                  Data retention & your rights: You may request access to, correction of, or deletion of your personal data at any time, subject to legal and operational limitations, by contacting [contact email/support]. Your data will be retained for as long as your account is active, or as required by law.

                </p>
              </div>

              {!termsScrolledToBottom && (
                <p className="terms-scroll-hint">Scroll to the end of the box above to read the full policy — the checkboxes will appear once you reach the bottom.</p>
              )}

              {termsScrolledToBottom && (
                <>
                  <div className="checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={termsAccepted}
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
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      />
                      <span>I have read and agree to the Privacy Policy.</span>
                    </label>
                  </div>
                  {errors.privacy_accepted && <p className="field-error">{errors.privacy_accepted}</p>}
                </>
              )}

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
