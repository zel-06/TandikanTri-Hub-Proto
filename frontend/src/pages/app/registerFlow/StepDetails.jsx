const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];

function calculateAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function ParticipantFields({ index, participant, onChange, roleLabel }) {
  function update(field) {
    return (e) => onChange(index, { ...participant, [field]: e.target.value });
  }

  return (
    <div className="form-row" style={{ display: 'block', marginBottom: '1.5rem' }}>
      {roleLabel && <label className="login-info-title">{roleLabel}</label>}
      <div className="form-row">
        <div className="form-group">
          <label>Full Name</label>
          <input className="form-control" value={participant.full_name} onChange={update('full_name')} required />
        </div>
        <div className="form-group">
          <label>Nationality</label>
          <input className="form-control" value={participant.nationality} onChange={update('nationality')} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Date of Birth</label>
          <input type="date" className="form-control" value={participant.date_of_birth} onChange={update('date_of_birth')} required />
        </div>
        <div className="form-group">
          <label>Age</label>
          <input className="form-control" value={calculateAge(participant.date_of_birth)} readOnly />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Gender</label>
          <select className="form-control" value={participant.gender} onChange={update('gender')} required>
            <option value="">-- Select --</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="form-group">
          <label>Finisher Shirt Size</label>
          <select className="form-control" value={participant.shirt_size} onChange={update('shirt_size')} required>
            <option value="">-- Select --</option>
            {SHIRT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function StepDetails({ category, form, setForm, onNext }) {
  const isRelay = category.is_relay;

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updateParticipant(index, next) {
    setForm((f) => {
      const participants = [...f.participants];
      participants[index] = next;
      return { ...f, participants };
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      {isRelay && (
        <>
          <label className="login-info-title">Team Name</label>
          <label className="input-group">
            <input value={form.team_name} onChange={updateField('team_name')} required />
          </label>
        </>
      )}

      {form.participants.map((participant, index) => (
        <ParticipantFields
          key={index}
          index={index}
          participant={participant}
          onChange={updateParticipant}
          roleLabel={isRelay ? category.relay_roles[index] : null}
        />
      ))}

      <label className="login-info-title">Contact Details</label>
      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input type="email" className="form-control" value={form.email} onChange={updateField('email')} required />
        </div>
        <div className="form-group">
          <label>Mobile Number</label>
          <input type="tel" className="form-control" value={form.mobile_number} onChange={updateField('mobile_number')} required />
        </div>
      </div>
      <div className="form-group">
        <label>Address (optional)</label>
        <input className="form-control" value={form.address} onChange={updateField('address')} />
      </div>

      <label className="login-info-title">Emergency Contact</label>
      <div className="form-row">
        <div className="form-group">
          <label>Name</label>
          <input className="form-control" value={form.emergency_contact_name} onChange={updateField('emergency_contact_name')} />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input className="form-control" value={form.emergency_contact_phone} onChange={updateField('emergency_contact_phone')} />
        </div>
      </div>

      <button className="btn btn-primary login-submit" type="submit">Next Step</button>
    </form>
  );
}
