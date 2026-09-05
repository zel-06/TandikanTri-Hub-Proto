import { Link } from 'react-router-dom';

export default function StepConfirmation({ registration }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
      <h1>Registration Submitted!</h1>
      <p style={{ color: '#4a5568', margin: '1rem 0' }}>
        Thank you, {registration.athlete_name}. Your registration for{' '}
        <strong>{registration.event_category.event_title} — {registration.event_category.name}</strong>{' '}
        has been received and is now pending payment verification. You'll get a notification once
        it's confirmed.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
        <Link to="/profile" className="btn btn-secondary">View My Registrations</Link>
        <Link to="/home" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}
