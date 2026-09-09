import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthNavbar from '../../../components/AuthNavbar';
import Footer from '../../../components/Footer';
import { useAuth } from '../../../context/AuthContext';
import * as authApi from '../../../api/auth';
import * as eventsApi from '../../../api/events';
import * as registrationsApi from '../../../api/registrations';
import RegistrationSteps from './RegistrationSteps';
import StepDetails from './StepDetails';
import StepAgreements from './StepAgreements';
import StepPayment from './StepPayment';

function profileAddress(user) {
  return [user.street, user.barangay, user.city, user.province, user.postal_code]
    .filter(Boolean)
    .join(', ');
}

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
  form.participants.forEach((participant, index) => {
    Object.entries(participant).forEach(([key, value]) => {
      data.append(`participants[${index}]${key}`, value);
    });
  });
  return data;
}

export default function RegistrationFlow() {
  const { eventId, categoryId } = useParams();
  const { user, refreshProfile } = useAuth();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState(null);
  const [keepRecords, setKeepRecords] = useState(true);

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
        if (keepRecords && user) {
          participants[0] = {
            ...participants[0],
            full_name: `${user.first_name} ${user.last_name}`.trim(),
            date_of_birth: user.birthdate || '',
          };
        }
        setForm({
          team_name: '',
          email: (keepRecords && user?.email) || '',
          mobile_number: (keepRecords && user?.phone) || '',
          address: (keepRecords && user) ? profileAddress(user) : '',
          emergency_contact_name: '', emergency_contact_phone: '',
          data_privacy_accepted: false, refund_policy_accepted: false,
          waiver_accepted: false, race_kit_policy_accepted: false,
          participants,
        });
      })
      .catch(() => setError('Could not load this event.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, categoryId]);

  useEffect(() => {
    // Refresh the cached profile so a just-approved verification status is reflected
    // without requiring the athlete to log out and back in.
    refreshProfile().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <FlowShell><p className="form-error-banner">{error}</p></FlowShell>;

  if (user && user.id_verification_status !== 'approved') {
    return (
      <FlowShell>
        <p className="form-error-banner">
          Your ID must be verified before you can register for an event. <Link to="/profile">Go to your profile</Link> to check your verification status.
        </p>
      </FlowShell>
    );
  }

  if (!event || !form) return <FlowShell><p className="loading-state">Loading registration form…</p></FlowShell>;

  const category = event.categories.find((c) => String(c.id) === String(categoryId));

  function toggleKeepRecords(next) {
    setKeepRecords(next);
    setForm((f) => {
      const participants = [...f.participants];
      if (next && user) {
        participants[0] = {
          ...participants[0],
          full_name: `${user.first_name} ${user.last_name}`.trim(),
          date_of_birth: user.birthdate || '',
        };
        return {
          ...f,
          participants,
          mobile_number: user.phone || '',
          address: profileAddress(user),
        };
      }
      return f;
    });
  }

  async function handlePayOnline() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await registrationsApi.submitRegistration(buildFormData(form, categoryId));
      if (keepRecords) {
        try {
          await authApi.updateMe({ phone: form.mobile_number, birthdate: form.participants[0].date_of_birth });
          await refreshProfile();
        } catch (syncErr) {
          console.error('Could not sync profile from registration', syncErr);
        }
      }
      const { checkout_url } = await registrationsApi.createCheckout(result.id);
      window.location.href = checkout_url;
    } catch (err) {
      const data = err.response?.data;
      setSubmitError(
        data?.non_field_errors?.[0] || data?.detail || JSON.stringify(data) || 'Could not start online payment.'
      );
      setSubmitting(false);
    }
  }

  return (
    <FlowShell>
      <div className="register-header" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
        <h1>{event.title} — {category.name}</h1>
      </div>

      <RegistrationSteps currentStep={step} />

      {step === 1 && (
        <StepDetails
          category={category}
          form={form}
          setForm={setForm}
          keepRecords={keepRecords}
          setKeepRecords={toggleKeepRecords}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepAgreements form={form} setForm={setForm} onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <StepPayment
          category={category}
          onPayOnline={handlePayOnline}
          onBack={() => setStep(2)}
          submitting={submitting}
          error={submitError}
        />
      )}
    </FlowShell>
  );
}

function FlowShell({ children }) {
  return (
    <>
      <AuthNavbar />
      <main className="login-main">
        <section className="create-account-card" style={{ maxWidth: '760px' }}>
          {children}
        </section>
      </main>
      <Footer />
    </>
  );
}
