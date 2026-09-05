import qrCode from '../../../assets/images/qr.jfif';

export default function StepPayment({ category, form, setForm, onSubmit, onBack, submitting, error }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="login-info-title">Payment Method</label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          type="radio"
          name="payment_method"
          checked={form.payment_method === 'gcash'}
          onChange={() => setForm((f) => ({ ...f, payment_method: 'gcash' }))}
        />
        <span>GCash</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="radio"
          name="payment_method"
          checked={form.payment_method === 'palawanpay'}
          onChange={() => setForm((f) => ({ ...f, payment_method: 'palawanpay' }))}
        />
        <span>PalawanPay</span>
      </label>

      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
        <img src={qrCode} alt="Payment QR code" style={{ maxWidth: '220px', borderRadius: '12px' }} />
      </div>

      <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
        Amount to pay: ₱{Number(category.fee).toLocaleString()}
      </p>

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
