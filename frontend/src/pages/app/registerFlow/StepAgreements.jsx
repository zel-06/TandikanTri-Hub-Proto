const AGREEMENTS = [
  {
    field: 'data_privacy_accepted',
    title: 'Data Privacy Agreement',
    body: 'In compliance with the Data Privacy Act of 2012 (RA 10173), Tandikan Tri Team collects and processes your personal information solely for event registration, safety, and communication purposes. Your data will not be shared with third parties without your consent, except as required by law or race safety protocols.',
  },
  {
    field: 'refund_policy_accepted',
    title: 'Refund & Local Cancellation Policy',
    body: 'Registration fees are non-refundable and non-transferable once payment has been confirmed. In the event of cancellation due to force majeure (natural disasters, government advisories, etc.), the organizers reserve the right to reschedule the event in lieu of issuing refunds.',
  },
  {
    field: 'waiver_accepted',
    title: 'Waiver of Liability',
    body: 'I understand that participating in a multisport event involves inherent risk. I voluntarily assume all risks associated with participation and release Tandikan Tri Team, its organizers, sponsors, and volunteers from any liability for injury, loss, or damage arising from my participation.',
  },
  {
    field: 'race_kit_policy_accepted',
    title: 'Race Kit Policy',
    body: 'Race kits (bib, timing chip, finisher shirt) will be released only upon presentation of a valid ID and proof of registration during the designated kit claiming schedule. Unclaimed kits after the event will not be shipped or refunded.',
  },
];

export default function StepAgreements({ form, setForm, onNext, onBack }) {
  const allAccepted = AGREEMENTS.every((a) => form[a.field]);

  function toggle(field) {
    setForm((f) => ({ ...f, [field]: !f[field] }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (allAccepted) onNext();
      }}
    >
      {AGREEMENTS.map((agreement) => (
        <details key={agreement.field} style={{ marginBottom: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{agreement.title}</summary>
          <p style={{ margin: '0.75rem 0', color: '#4a5568', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {agreement.body}
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={form[agreement.field]}
              onChange={() => toggle(agreement.field)}
            />
            <span>I have read and agree to the {agreement.title}</span>
          </label>
        </details>
      ))}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="btn btn-secondary" type="button" onClick={onBack}>Back</button>
        <button className="btn btn-primary login-submit" type="submit" disabled={!allAccepted}>
          Next Step
        </button>
      </div>
    </form>
  );
}
