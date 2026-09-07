export default function StepPayment({ category, onPayOnline, onBack, submitting, error }) {
  return (
    <div>
      <div className="payment-grid">
        <div>
          <p className="payment-label">Complete Your Payment</p>
          <div className="payment-callout">
            <p>
              Payment is handled securely through PayMongo and verified automatically — your
              registration confirms the moment your payment goes through, no waiting for staff review.
            </p>
          </div>

          <button
            className="btn btn-primary login-submit"
            type="button"
            onClick={onPayOnline}
            disabled={submitting}
          >
            {submitting ? 'Redirecting…' : `Pay ₱${Number(category.fee).toLocaleString()} Now`}
          </button>

          {error && <p className="form-error-banner" style={{ marginTop: '1rem' }}>{error}</p>}
        </div>

        <div className="qr-card">
          <p className="qr-header">Order Summary</p>
          <p className="qr-amount">₱{Number(category.fee).toLocaleString()}</p>
          <p className="qr-note">{category.event_title || category.name} — {category.name}</p>
          <p className="qr-note">Pay with GCash, Maya, or a debit/credit card on the next screen.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="btn btn-secondary" type="button" onClick={onBack} disabled={submitting}>Back</button>
      </div>
    </div>
  );
}
