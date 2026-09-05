import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';

export default function MinimalNavbar() {
  return (
    <header className="navbar">
      <div className="logo-container">
        <Link to="/"><img src={logo} alt="Tandikan Tri Team Logo" /></Link>
        <span className="logo-text">Tandikan Tri-Hub</span>
      </div>
      <a href="#contact" className="btn-nav">Contact Us</a>
    </header>
  );
}
