import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MinimalNavbar from '../../components/MinimalNavbar';
import Footer from '../../components/Footer';
import * as authApi from '../../api/auth';
import { EyeIcon, EyeOffIcon } from '../../components/EyeIcon';
import { getPasswordChecks, getPasswordStrength, isPasswordValid } from '../../utils/password';
import logo from '../../assets/images/logo.png';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);
  const otpCode = otpDigits.join('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordChecks = getPasswordChecks(newPassword, '', email);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    setErrors({});
    setSendingCode(true);
    try {
      const res = await authApi.requestPasswordResetCode(email);
      setOtpDigits(['', '', '', '', '', '']);
      setCooldown(res.cooldown_seconds || 60);
      return true;
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Something went wrong. Please try again.' });
      return false;
    } finally {
      setSendingCode(false);
    }
  }

  async function handleRequestCode(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrors({ email: 'Enter a valid email address.' });
      return;
    }
    const ok = await requestCode();
    if (ok) setStep(2);
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

  async function handleVerifyCode(e) {
    e?.preventDefault();
    setErrors({});
    setVerifyingCode(true);
    try {
      const res = await authApi.verifyPasswordResetCode(email, otpCode);
      setResetToken(res.reset_token);
      setStep(3);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Something went wrong. Please try again.' });
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    const newErrors = {};
    if (newPassword !== confirmPassword) {
      newErrors.confirm_password = 'Passwords do not match.';
    } else if (!isPasswordValid(newPassword, '', email)) {
      newErrors.new_password = 'Please meet all the password requirements above.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setResetting(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setDone(true);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Something went wrong. Please try again.' });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="login-page">
      <MinimalNavbar />

      <main className="login-main">
        <section className="login-card">
          <div className="login-logo">
            <img src={logo} alt="Tandikan Tri Team Logo" />
          </div>

          {done ? (
            <>
              <p className="login-subtitle">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <button type="button" className="btn btn-primary login-submit" onClick={() => navigate('/login')}>
                Back to Login
              </button>
            </>
          ) : (
            <>
              {step === 1 && (
                <>
                  <p className="login-subtitle">Enter the email linked to your account and we'll send you a verification code.</p>
                  <form className="login-form" onSubmit={handleRequestCode}>
                    <label className="login-input-group">
                      <input
                        type="email"
                        placeholder="email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </label>
                    {errors.email && <p className="field-error">{errors.email}</p>}
                    {errors.non_field && <p className="field-error">{errors.non_field}</p>}

                    <button type="submit" className="btn btn-primary login-submit" disabled={sendingCode}>
                      {sendingCode ? 'Sending…' : 'Send Code'}
                    </button>
                  </form>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="login-subtitle">
                    If an account exists for <strong>{email}</strong>, a 6-digit code was sent to it. Enter it below.
                  </p>
                  <form className="login-form" onSubmit={handleVerifyCode}>
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
                    {errors.code && <p className="field-error">{errors.code}</p>}
                    {errors.non_field && <p className="field-error">{errors.non_field}</p>}

                    <div className="otp-actions">
                      <span className="otp-hint">Code expires in 5 minutes</span>
                      <button
                        type="button"
                        className="link-button"
                        disabled={cooldown > 0 || sendingCode}
                        onClick={requestCode}
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                      </button>
                    </div>

                    <div className="step-actions">
                      <button className="btn btn-outline" type="button" onClick={() => setStep(1)}>Back</button>
                      <button className="btn btn-primary login-submit" type="submit" disabled={verifyingCode || otpCode.length < 6}>
                        {verifyingCode ? 'Verifying…' : 'Verify Code'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {step === 3 && (
                <>
                  <p className="login-subtitle">Choose a new password for your account.</p>
                  <form className="login-form" onSubmit={handleResetPassword}>
                    <label className="input-group password-field">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="link-button password-toggle"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </label>
                    <label className="input-group password-field">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="link-button password-toggle"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </label>

                    <div className="password-strength">
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
                    {errors.new_password && <p className="field-error">{errors.new_password}</p>}
                    {errors.confirm_password && <p className="field-error">{errors.confirm_password}</p>}
                    {errors.reset_token && <p className="field-error">{errors.reset_token}</p>}
                    {errors.non_field && <p className="field-error">{errors.non_field}</p>}

                    <button type="submit" className="btn btn-primary login-submit" disabled={resetting}>
                      {resetting ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          <div className="login-footer">
            <p>Remembered your password? <Link to="/login">Login</Link></p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
