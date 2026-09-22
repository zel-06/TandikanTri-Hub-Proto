import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MinimalNavbar from '../../components/MinimalNavbar';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { EyeIcon, EyeOffIcon } from '../../components/EyeIcon';
import { ROLES } from '../../roles';
import logo from '../../assets/images/logo.png';
import emailIcon from '../../assets/images/email_icon.png';
import passIcon from '../../assets/images/pass_icon.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(username, password, rememberMe);
      const from = location.state?.from?.pathname;
      if (from) navigate(from, { replace: true });
      else if (user.role === ROLES.ATHLETE) navigate('/home', { replace: true });
      else navigate('/dashboard/overview', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] ||
        'Invalid username or password.'
      );
    } finally {
      setSubmitting(false);
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
          <h1>Welcome Athletes</h1>
          <p className="login-subtitle">Sign in to your Tandikan Tri-Hub account</p>

          {sessionExpired && (
            <p className="form-error-banner">Your session has expired. Please log in again.</p>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-input-group">
              <img src={emailIcon} alt="email icon" className="input-icon" />
              <input
                type="text"
                placeholder="Username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="input-group password-field">
              <img src={passIcon} alt="password icon" className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <div className="login-options-row">
              <div className="checkbox-field">
                <label>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button type="button" className="link-button forgot-password-link" onClick={() => navigate('/forgot-password')}>
                Forgot password?
              </button>
            </div>

            {error && <p style={{ color: '#ff6d79', fontSize: '0.9rem' }}>{String(error)}</p>}

            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
              {submitting ? 'Logging-in…' : 'Login'}
            </button>

          </form>

          <div className="login-footer">
            <p>Don't have an account? <Link to="/register">Create account</Link></p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
