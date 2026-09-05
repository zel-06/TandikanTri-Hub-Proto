import { Link } from 'react-router-dom';
import AuthNavbar from '../../components/AuthNavbar';
import CommunityFeed from '../../components/CommunityFeed';
import Footer from '../../components/Footer';
import logo from '../../assets/images/logo.png';

export default function Home() {
  return (
    <>
      <AuthNavbar />

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
            <Link to="/events" className="btn btn-primary">Browse Events</Link>
          </div>
        </div>
      </main>

      <CommunityFeed />

      <Footer />
    </>
  );
}
