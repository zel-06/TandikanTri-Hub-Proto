import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MinimalNavbar from '../../components/MinimalNavbar';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../roles';
import logo from '../../assets/images/logo.png';
import emailIcon from '../../assets/images/email_icon.png';
import passIcon from '../../assets/images/pass_icon.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(username, password);
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
          <p className="login-subtitle">Sign in to Tandikan Tri-Hub</p>

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
            <label className="input-group">
              <img src={passIcon} alt="password icon" className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && <p style={{ color: '#ff6d79', fontSize: '0.9rem' }}>{String(error)}</p>}

            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <Link to="/register">Create an Account</Link></p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
