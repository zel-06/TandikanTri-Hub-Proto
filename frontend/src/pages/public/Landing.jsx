import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import PhotoGallery from '../../components/PhotoGallery';
import Footer from '../../components/Footer';
import logo from '../../assets/images/logo.png';
import photo1 from '../../assets/images/1.jpg';
import photo2 from '../../assets/images/2.jpg';
import photo3 from '../../assets/images/3.jpg';
import photo4 from '../../assets/images/4.jpg';
import photo5 from '../../assets/images/5.jpg';

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

      <section className="section community-feeds">
        <div className="section-content">
          <h2 className="section-title" style={{ textAlign: 'center' }}>Community Feeds</h2>

          <div className="feeds-list">
            <article className="feed-card announcement-card">
              <h3>Upcoming Event!</h3>
              <p className="feed-meta">Tandikan Tri Team · Today</p>
              <p>
                Registration for the IBP Marathon is now open. Early bird slots are available
                until December 10 2026, so secure your place now.
              </p>
              <Link to="/login" className="btn btn-primary merch-btny">View Full Details</Link>
            </article>

            <article className="feed-card gallery-card">
              <h3>Duathlon Event</h3>
              <p className="feed-meta">Highlights</p>
              <p>
                See the energy from our past races — athletes crossing the finish line, cheering
                crowds, and memorable community moments.
              </p>
              <PhotoGallery photos={[photo1, photo2, photo3, photo4, photo5]} />
              <div className="feed-actions">
                <Link to="/login" className="action-btn">❤ Like</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
