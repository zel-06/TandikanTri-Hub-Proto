import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import CommunityFeed from '../../components/CommunityFeed';
import Footer from '../../components/Footer';
import logo from '../../assets/images/logo.png';

export default function Landing() {
  return (
    <>
      <PublicNavbar />

      <main className="hero">
        <div className="hero-content">
          <div className="hero-logo">
            <img src={logo} alt="Tandikan Tri Team Logo" />
            <h1>Tandikan<br /><span>Tri Team</span></h1>
          </div>

          <p className="hero-text">
            Welcome to the Tandikan Tri-Hub—a community where you belong! Register today,
            easily manage your athletic journey, and prepare to conquer your next race.
          </p>

          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary">Login / Create Account</Link>
          </div>
        </div>
      </main>

      <CommunityFeed />

      <Footer />
    </>
  );
}
