import { Link } from 'react-router-dom';
import AuthNavbar from '../../components/AuthNavbar';
import PublicNavbar from '../../components/PublicNavbar';
import CommunityFeed from '../../components/CommunityFeed';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';

export default function Landing() {
  const { user } = useAuth();
  return (
    <>
      {user ? <AuthNavbar /> : <PublicNavbar />}

      <main className="hero">
        <div className="hero-content">
          <div className="hero-logo">
            <img src={logo} alt="Tandikan Tri Team Logo" />
            <h1>Tandikan<br /><span>Tri-Hub</span></h1>
          </div>

          <p className="hero-text">
            Ready to race? Join the Tandikan Tri-Hub, log in or create your account, 
            register for your next race, and catch every announcement and recent event photos through our community feed. 
            Become part of the Tandikan Tri Team community.
          </p>

          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary">Login or Create account</Link>
          </div>
        </div>
      </main>

      <CommunityFeed />

      <Footer />
    </>
  );
}
