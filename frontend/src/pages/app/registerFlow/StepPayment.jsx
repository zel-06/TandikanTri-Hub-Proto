import qrCode from '../../../assets/images/qr.jfif';

export default function StepPayment({ category, form, setForm, onSubmit, onBack, submitting, error }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="payment-grid">
        <div>
          <p className="payment-label">Payment Method</p>
          <div className="payment-methods">
            <label className="payment-method">
              <input
                type="radio"
                name="payment_method"
                checked={form.payment_method === 'gcash'}
                onChange={() => setForm((f) => ({ ...f, payment_method: 'gcash' }))}
              />
              <span>GCash</span>
            </label>
            <label className="payment-method">
              <input
                type="radio"
                name="payment_method"
                checked={form.payment_method === 'palawanpay'}
                onChange={() => setForm((f) => ({ ...f, payment_method: 'palawanpay' }))}
              />
              <span>PalawanPay</span>
            </label>
          </div>

          <br />

          <div className="payment-callout">
            <p>
              Scan the QR code with your {form.payment_method === 'gcash' ? 'GCash' : 'PalawanPay'} app to pay
              <strong> ₱{Number(category.fee).toLocaleString()}</strong>, then upload your proof of payment below.
            </p>
          </div>

          <div className="upload-section">
            <label>Proof of Payment (optional — you can also upload this later)</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="proofOfPayment"
                accept="image/*"
                onChange={(e) => setForm((f) => ({ ...f, proof_of_payment: e.target.files?.[0] || null }))}
              />
              <label htmlFor="proofOfPayment" className="file-input-label">
                <span>{form.proof_of_payment ? form.proof_of_payment.name : 'Choose file'}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="qr-card">
          <p className="qr-header">Scan to Pay</p>
          <div className="qr-box">
            <img
              src={qrCode}
              alt="Payment QR code"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '18px' }}
            />
          </div>
          <p className="qr-amount">₱{Number(category.fee).toLocaleString()}</p>
          <p className="qr-note">Works with GCash and PalawanPay.</p>
        </div>
      </div>

      {error && <p className="form-error-banner">{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="btn btn-secondary" type="button" onClick={onBack} disabled={submitting}>Back</button>
        <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Registration'}
        </button>
      </div>
    </form>
  );
}
