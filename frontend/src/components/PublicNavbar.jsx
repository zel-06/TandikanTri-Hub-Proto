import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';

export default function PublicNavbar() {
  return (
    <header className="navbar">
      <div className="logo-container">
        <Link to="/"><img src={logo} alt="Tandikan Tri Team Logo" /></Link>
        <span className="logo-text">Tandikan Tri-Hub</span>
      </div>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <div className="nav-actions">
        <Link to="/login" className="btn-nav">Login / Create Account</Link>
      </div>
    </header>
  );
}
