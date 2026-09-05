import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import * as eventsApi from '../../api/events';

const DISTANCES_BY_DISCIPLINE = {
  marathon: ['3K', '5K', '10K', '21K (Half Marathon)', '42K (Full Marathon)'],
  duathlon: ['Relay', 'Solo'],
  triathlon: ['Relay', 'Solo'],
};

const RELAY_ROLES_BY_DISCIPLINE = {
  duathlon: ['Runner', 'Cyclist'],
  triathlon: ['Swimmer', 'Cyclist', 'Runner'],
};

const emptyEventForm = { title: '', venue: '', date: '', discipline: '', description: '', distance: '' };

export default function EventManagement() {
  const [events, setEvents] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [distanceRows, setDistanceRows] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [participantsModal, setParticipantsModal] = useState(null);

  function loadEvents() {
    eventsApi.listEvents().then(setEvents).catch(() => setError('Could not load events.'));
  }

  useEffect(loadEvents, []);

  function handleDisciplineChange(e) {
    const discipline = e.target.value;
    setEventForm((f) => ({ ...f, discipline }));
    const distances = DISTANCES_BY_DISCIPLINE[discipline] || [];
    setDistanceRows(distances.map((name) => ({
      name,
      enabled: false,
      fee: '',
      slots: '',
      isRelay: name === 'Relay',
    })));
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('title', eventForm.title);
      formData.append('venue', eventForm.venue);
      formData.append('date', eventForm.date);
      formData.append('discipline', eventForm.discipline);
      formData.append('description', eventForm.description);
      formData.append('distance', eventForm.distance);
      formData.append('status', 'published');
      if (photoFile) formData.append('hero_image', photoFile);

      const event = await eventsApi.createEvent(formData);

      const selectedRows = distanceRows.filter((row) => row.enabled && row.fee && row.slots);
      for (const row of selectedRows) {
        await eventsApi.createCategory(event.id, {
          name: row.name,
          fee: row.fee,
          total_slots: row.slots,
          is_relay: row.isRelay,
          relay_roles: row.isRelay ? (RELAY_ROLES_BY_DISCIPLINE[eventForm.discipline] || []) : [],
        });
      }

      setEventForm(emptyEventForm);
      setPhotoFile(null);
      setDistanceRows([]);
      loadEvents();
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Could not create event.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(eventId) {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    await eventsApi.deleteEvent(eventId);
    loadEvents();
  }

  async function openParticipants(event) {
    const participants = await eventsApi.listParticipants(event.id);
    setParticipantsModal({ event, participants });
  }

  return (
    <DashboardLayout title="Event Management">
      <section style={{ display: 'grid', gap: '2rem' }}>
        <article className="card overview-card">
          <div className="card-header">
            <div><h3>Create Upcoming Event</h3></div>
          </div>
          <div className="card-content">
            <form onSubmit={handleCreateEvent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Event Title</label>
                  <input className="form-control" value={eventForm.title}
                    onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Venue / Location</label>
                  <input className="form-control" value={eventForm.venue}
                    onChange={(e) => setEventForm((f) => ({ ...f, venue: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Event Date</label>
                  <input type="date" className="form-control" value={eventForm.date}
                    onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Event Category</label>
                  <select className="form-control" value={eventForm.discipline} onChange={handleDisciplineChange} required>
                    <option value="">-- Select Category --</option>
                    <option value="marathon">Marathon</option>
                    <option value="duathlon">Duathlon</option>
                    <option value="triathlon">Triathlon</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Distance (optional)</label>
                  <input className="form-control" placeholder="e.g. 3km swim - 180km bike - 42km run"
                    value={eventForm.distance}
                    onChange={(e) => setEventForm((f) => ({ ...f, distance: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Event Photo (optional)</label>
                  <input type="file" accept="image/*" className="form-control"
                    onChange={(e) => setPhotoFile(e.target.files[0] || null)} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" value={eventForm.description}
                  onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              {distanceRows.length > 0 && (
                <div style={{ margin: '0 0 1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '1rem', color: '#9cb3d8', fontWeight: 600 }}>
                    Distances &amp; Fees
                  </label>
                  {distanceRows.map((row, i) => (
                    <div className="distance-row" key={row.name}>
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => setDistanceRows((rows) =>
                          rows.map((r, idx) => idx === i ? { ...r, enabled: e.target.checked } : r))}
                      />
                      <label>{row.name}</label>
                      <div className="distance-inputs">
                        <input
                          type="number" min="0" placeholder="Reg. Fee (₱)" value={row.fee}
                          onChange={(e) => setDistanceRows((rows) =>
                            rows.map((r, idx) => idx === i ? { ...r, fee: e.target.value } : r))}
                        />
                        <input
                          type="number" min="1" placeholder="Total Slots" value={row.slots}
                          onChange={(e) => setDistanceRows((rows) =>
                            rows.map((r, idx) => idx === i ? { ...r, slots: e.target.value } : r))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="form-error-banner">{error}</p>}

              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? 'Publishing…' : 'Publish Event'}
              </button>
            </form>
          </div>
        </article>

        <article className="card overview-card">
          <div className="card-header">
            <div><h3>Existing Events</h3></div>
          </div>
          <div className="card-content" style={{ overflowX: 'auto' }}>
            {!events && <p className="loading-state">Loading…</p>}
            {events && (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Title</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Venue</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Date</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Categories</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{event.title}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{event.venue}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(event.date).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {event.categories.map((c) => `${c.name} (${c.filled_slots}/${c.total_slots})`).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <button className="action-btn btn-delete" onClick={() => handleDelete(event.id)}>Delete</button>
                        <button className="action-btn btn-participants" onClick={() => openParticipants(event)}>
                          Participants List
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>
      </section>

      {participantsModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Participants List — {participantsModal.event.title}</h3>
              <button className="close-btn" onClick={() => setParticipantsModal(null)}>&times;</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                className="btn btn-secondary"
                style={{ background: 'rgba(255, 87, 87, 0.1)', color: '#ff6d79', borderColor: 'rgba(255, 87, 87, 0.2)' }}
                onClick={() => eventsApi.exportParticipants(participantsModal.event.id, participantsModal.event.title)}
              >
                📄 Export CSV
              </button>
            </div>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '0.8rem' }}>Name</th>
                  <th style={{ padding: '0.8rem' }}>Category / Role</th>
                </tr>
              </thead>
              <tbody>
                {participantsModal.participants.length === 0 && (
                  <tr><td colSpan={2} style={{ padding: '0.8rem' }}>No participants yet.</td></tr>
                )}
                {participantsModal.participants.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.8rem', fontWeight: 600 }}>{p.full_name}</td>
                    <td style={{ padding: '0.8rem' }}>{p.role || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
