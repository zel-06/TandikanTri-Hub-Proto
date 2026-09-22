import { Link } from 'react-router-dom';
import AuthNavbar from '../../components/AuthNavbar';
import CommunityFeed from '../../components/CommunityFeed';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <AuthNavbar />

      <main className="hero">
        <div className="hero-content">
          <div className="hero-logo">
            <img src={logo} alt="Tandikan Tri Team Logo" />
            <h1>Tandikan<br /><span>Tri-Hub</span></h1>
          </div>

          <h2>Welcome back, {user?.username}!</h2>
          <p className="hero-text">
            Your next race is waiting — browse upcoming events, register,
            and stay updated through the community feed.
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
