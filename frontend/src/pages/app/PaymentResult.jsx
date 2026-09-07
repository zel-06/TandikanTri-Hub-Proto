import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthNavbar from '../../components/AuthNavbar';
import Footer from '../../components/Footer';
import * as registrationsApi from '../../api/registrations';
import '../../styles/event-detail.css';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id');
  const cancelled = searchParams.get('cancelled') === '1';

  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState('');
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!registrationId) {
      setError('No registration was specified.');
      return;
    }

    let cancelledEffect = false;

    function poll() {
      registrationsApi.getRegistration(registrationId)
        .then((data) => {
          if (cancelledEffect) return;
          setRegistration(data);
          const stillPending = data.payment?.status === 'pending';
          if (stillPending && !cancelled && pollCountRef.current < MAX_POLLS) {
            pollCountRef.current += 1;
            setTimeout(poll, POLL_INTERVAL_MS);
          }
        })
        .catch(() => { if (!cancelledEffect) setError('Could not load your registration.'); });
    }

    poll();
    return () => { cancelledEffect = true; };
  }, [registrationId, cancelled]);

  const paymentStatus = registration?.payment?.status;

  return (
    <div className="event-detail-page">
      <AuthNavbar />
      <main className="event-detail-main">
        <div className="section-content" style={{ maxWidth: '640px' }}>
          <article className="event-register-card event-confirmation-card">
            {error && <p className="form-error-banner">{error}</p>}

            {!error && !registration && <p className="loading-state">Checking your payment…</p>}

            {!error && registration && cancelled && (
              <>
                <div className="confirmation-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>✕</div>
                <h2>Payment Cancelled</h2>
                <p className="confirmation-text">
                  You cancelled the online payment. Your registration is still saved — you can try paying
                  again or upload proof of payment manually from your profile.
                </p>
              </>
            )}

            {!error && registration && !cancelled && paymentStatus === 'verified' && (
              <>
                <div className="confirmation-icon">✓</div>
                <h2>Payment Verified!</h2>
                <p className="confirmation-text">
                  Thank you, {registration.athlete_name}. Your payment for{' '}
                  <strong>{registration.event_category.event_title} — {registration.event_category.name}</strong>{' '}
                  has been confirmed. Your bib number is <strong>{registration.bib_number}</strong>.
                </p>
              </>
            )}

            {!error && registration && !cancelled && paymentStatus === 'pending' && (
              <>
                <div className="confirmation-icon" style={{ background: '#fef3c7', color: '#b45309' }}>…</div>
                <h2>Confirming Your Payment</h2>
                <p className="confirmation-text">
                  We're waiting for PayMongo to confirm your payment — this is usually instant but can take
                  a moment. This page will update automatically.
                </p>
              </>
            )}

            {!error && registration && !cancelled && paymentStatus === 'rejected' && (
              <>
                <div className="confirmation-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>✕</div>
                <h2>Payment Not Verified</h2>
                <p className="confirmation-text">
                  We couldn't confirm this payment. Please try again or contact us for help.
                </p>
              </>
            )}

            {(error || registration) && (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                <Link to="/profile" className="btn btn-secondary">View My Registrations</Link>
                <Link to="/home" className="btn btn-primary">Back to Home</Link>
              </div>
            )}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
