import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AuthNavbar from '../../../components/AuthNavbar';
import Footer from '../../../components/Footer';
import * as eventsApi from '../../../api/events';
import * as registrationsApi from '../../../api/registrations';
import StepDetails from './StepDetails';
import StepAgreements from './StepAgreements';
import StepPayment from './StepPayment';
import StepConfirmation from './StepConfirmation';

const STEP_LABELS = ['Personal Details', 'Agreements', 'Payment', 'Confirmation'];

function blankParticipant(role = '') {
  return { role, full_name: '', date_of_birth: '', gender: '', nationality: 'Filipino', shirt_size: '' };
}

function buildFormData(form, categoryId) {
  const data = new FormData();
  data.append('event_category', categoryId);
  data.append('team_name', form.team_name);
  data.append('email', form.email);
  data.append('mobile_number', form.mobile_number);
  data.append('address', form.address);
  data.append('emergency_contact_name', form.emergency_contact_name);
  data.append('emergency_contact_phone', form.emergency_contact_phone);
  data.append('data_privacy_accepted', form.data_privacy_accepted);
  data.append('refund_policy_accepted', form.refund_policy_accepted);
  data.append('waiver_accepted', form.waiver_accepted);
  data.append('race_kit_policy_accepted', form.race_kit_policy_accepted);
  data.append('payment_method', form.payment_method);
  if (form.proof_of_payment) data.append('proof_of_payment', form.proof_of_payment);
  form.participants.forEach((participant, index) => {
    Object.entries(participant).forEach(([key, value]) => {
      data.append(`participants[${index}]${key}`, value);
    });
  });
  return data;
}

export default function RegistrationFlow() {
  const { eventId, categoryId } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [registration, setRegistration] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => {
    eventsApi.getEvent(eventId)
      .then((data) => {
        setEvent(data);
        const category = data.categories.find((c) => String(c.id) === String(categoryId));
        if (!category) {
          setError('This category could not be found.');
          return;
        }
        const participants = category.is_relay
          ? category.relay_roles.map(blankParticipant)
          : [blankParticipant()];
        setForm({
          team_name: '', email: '', mobile_number: '', address: '',
          emergency_contact_name: '', emergency_contact_phone: '',
          data_privacy_accepted: false, refund_policy_accepted: false,
          waiver_accepted: false, race_kit_policy_accepted: false,
          payment_method: 'gcash', proof_of_payment: null,
          participants,
        });
      })
      .catch(() => setError('Could not load this event.'));
  }, [eventId, categoryId]);

  if (error) return <FlowShell><p className="form-error-banner">{error}</p></FlowShell>;
  if (!event || !form) return <FlowShell><p className="loading-state">Loading registration form…</p></FlowShell>;

  const category = event.categories.find((c) => String(c.id) === String(categoryId));

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await registrationsApi.submitRegistration(buildFormData(form, categoryId));
      setRegistration(result);
      setStep(4);
    } catch (err) {
      const data = err.response?.data;
      setSubmitError(
        data?.non_field_errors?.[0] || data?.detail || JSON.stringify(data) || 'Could not submit registration.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FlowShell>
      <h1>{event.title} — {category.name}</h1>
      {step < 4 && (
        <p className="feed-meta" style={{ marginBottom: '1.5rem' }}>
          Step {step} of 4 · {STEP_LABELS[step - 1]}
        </p>
      )}

      {step === 1 && (
        <StepDetails category={category} form={form} setForm={setForm} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <StepAgreements form={form} setForm={setForm} onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <StepPayment
          category={category}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onBack={() => setStep(2)}
          submitting={submitting}
          error={submitError}
        />
      )}
      {step === 4 && registration && <StepConfirmation registration={registration} />}
    </FlowShell>
  );
}

function FlowShell({ children }) {
  return (
    <>
      <AuthNavbar />
      <main className="login-main">
        <section className="create-account-card" style={{ maxWidth: '640px' }}>
          {children}
        </section>
      </main>
      <Footer />
    </>
  );
}
