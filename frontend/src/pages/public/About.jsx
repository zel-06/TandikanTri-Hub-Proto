import AuthNavbar from '../../components/AuthNavbar';
import PublicNavbar from '../../components/PublicNavbar';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';

export default function About() {
  const { user } = useAuth();
  return (
    <>
      {user ? <AuthNavbar /> : <PublicNavbar />}
      <main className="section">
        <div className="section-content">
          <h2 className="section-title">Our Story</h2>
          <p>
            Tandikan Tri Team is a Palawan-based multisport community dedicated to promoting
            triathlon, duathlon, and running culture across the region. Since our founding, we've
            organized races that bring together athletes of every level — from first-time finishers
            to seasoned competitors — in the spirit of discipline, community, and personal growth.
          </p>
          <p>
            Tandikan Tri-Hub is our centralized platform for managing registrations, events, and
            the athlete journey from sign-up to finish line.
          </p>

          <h2 className="section-title" style={{ marginTop: '2rem' }}>Contact Us</h2>
          <p>Email: tandikantrihub@gmail.com</p>
          <p>Phone: +63 917 000 0000</p>
          <p>Address: Puerto Princesa City, Palawan, Philippines</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
