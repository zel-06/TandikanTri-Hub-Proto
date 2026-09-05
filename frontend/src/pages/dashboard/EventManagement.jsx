import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import * as eventsApi from '../../api/events';
import * as feedApi from '../../api/feed';

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
const emptyPostForm = { post_type: 'announcement', title: '', body: '', event: '' };

export default function EventManagement() {
  const [events, setEvents] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [existingEventPhoto, setExistingEventPhoto] = useState(null);
  const [distanceRows, setDistanceRows] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [participantsModal, setParticipantsModal] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState(null);

  const [posts, setPosts] = useState(null);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [postPhotos, setPostPhotos] = useState([]);
  const [postCreating, setPostCreating] = useState(false);
  const [postError, setPostError] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [deletePostTarget, setDeletePostTarget] = useState(null);

  function loadEvents() {
    eventsApi.listEvents().then(setEvents).catch(() => setError('Could not load events.'));
  }

  function loadPosts() {
    feedApi.listPosts().then(setPosts).catch(() => setPostError('Could not load community posts.'));
  }

  useEffect(loadEvents, []);
  useEffect(loadPosts, []);

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

  function handleEditEvent(event) {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      venue: event.venue,
      date: event.date,
      discipline: event.discipline,
      description: event.description || '',
      distance: event.distance || '',
    });
    setDistanceRows((DISTANCES_BY_DISCIPLINE[event.discipline] || []).map((name) => ({
      name, enabled: false, fee: '', slots: '', isRelay: name === 'Relay',
    })));
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setExistingEventPhoto(event.hero_image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleEventPhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function removeEventPhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
  }

  function cancelEditEvent() {
    setEditingEventId(null);
    setEventForm(emptyEventForm);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setExistingEventPhoto(null);
    setDistanceRows([]);
  }

  async function handleSubmitEvent(e) {
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

      const event = editingEventId
        ? await eventsApi.updateEvent(editingEventId, formData)
        : await eventsApi.createEvent(formData);

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

      cancelEditEvent();
      loadEvents();
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Could not save event.');
    } finally {
      setCreating(false);
    }
  }

  async function confirmDeleteEvent() {
    const eventId = deleteEventTarget;
    setDeleteEventTarget(null);
    await eventsApi.deleteEvent(eventId);
    if (editingEventId === eventId) cancelEditEvent();
    loadEvents();
  }

  async function openParticipants(event) {
    const participants = await eventsApi.listParticipants(event.id);
    setParticipantsModal({ event, participants });
  }

  function addPostPhotos(files) {
    const added = Array.from(files || []).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPostPhotos((prev) => [...prev, ...added]);
  }

  function removePostPhoto(index) {
    setPostPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function clearPostPhotos() {
    setPostPhotos((prev) => {
      prev.forEach(({ url }) => URL.revokeObjectURL(url));
      return [];
    });
  }

  function handleEditPost(post) {
    setEditingPostId(post.id);
    setPostForm({
      post_type: post.post_type,
      title: post.title,
      body: post.body || '',
      event: post.event || '',
    });
    clearPostPhotos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditPost() {
    setEditingPostId(null);
    setPostForm(emptyPostForm);
    clearPostPhotos();
  }

  async function handleSubmitPost(e) {
    e.preventDefault();
    setPostError('');
    setPostCreating(true);
    try {
      const formData = new FormData();
      formData.append('post_type', postForm.post_type);
      formData.append('title', postForm.title);
      formData.append('body', postForm.body);
      if (postForm.event) formData.append('event', postForm.event);
      postPhotos.forEach(({ file }) => formData.append('images', file));

      if (editingPostId) {
        await feedApi.updatePost(editingPostId, formData);
      } else {
        await feedApi.createPost(formData);
      }
      cancelEditPost();
      loadPosts();
    } catch (err) {
      setPostError(JSON.stringify(err.response?.data) || 'Could not save post.');
    } finally {
      setPostCreating(false);
    }
  }

  async function confirmDeletePost() {
    const postId = deletePostTarget;
    setDeletePostTarget(null);
    await feedApi.deletePost(postId);
    if (editingPostId === postId) cancelEditPost();
    loadPosts();
  }

  return (
    <DashboardLayout title="Event Management">
      <section style={{ display: 'grid', gap: '2rem' }}>
        <article className="card overview-card">
          <div className="card-header">
            <div><h3>{editingEventId ? 'Edit Event' : 'Create Upcoming Event'}</h3></div>
          </div>
          <div className="card-content">
            <form onSubmit={handleSubmitEvent}>
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
                  <input type="file" accept="image/*" className="form-control" value=""
                    onChange={handleEventPhotoChange} />
                  {photoPreviewUrl && (
                    <div className="photo-picker-preview">
                      <div className="photo-picker-thumb">
                        <img src={photoPreviewUrl} alt="Selected event photo" />
                        <button type="button" className="photo-picker-remove" title="Remove photo"
                          onClick={removeEventPhoto}>&times;</button>
                      </div>
                    </div>
                  )}
                  {!photoPreviewUrl && existingEventPhoto && (
                    <>
                      <div className="photo-picker-preview">
                        <div className="photo-picker-thumb">
                          <img src={existingEventPhoto} alt="Current event photo" />
                        </div>
                      </div>
                      <p className="form-hint">Current photo will be kept unless you choose a new one.</p>
                    </>
                  )}
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
                    Distances &amp; Fees{editingEventId ? ' (add new categories only)' : ''}
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" type="submit" disabled={creating}>
                  {creating ? 'Saving…' : editingEventId ? 'Save Changes' : 'Publish Event'}
                </button>
                {editingEventId && (
                  <button className="btn btn-secondary" type="button" onClick={cancelEditEvent}>
                    Cancel Edit
                  </button>
                )}
              </div>
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
                        <button className="action-btn btn-edit" onClick={() => handleEditEvent(event)}>Edit</button>
                        <button className="action-btn btn-delete" onClick={() => setDeleteEventTarget(event.id)}>Delete</button>
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

        <article className="card overview-card">
          <div className="card-header">
            <div><h3>{editingPostId ? 'Edit Community Post' : 'Post to Community Feed'}</h3></div>
          </div>
          <div className="card-content">
            <form onSubmit={handleSubmitPost}>
              <div className="form-row">
                <div className="form-group">
                  <label>Post Type</label>
                  <select className="form-control" value={postForm.post_type}
                    onChange={(e) => setPostForm((f) => ({ ...f, post_type: e.target.value }))}>
                    <option value="announcement">Upcoming Event (Announcement)</option>
                    <option value="gallery">Recent Event Photos (Gallery)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Link to Event (optional)</label>
                  <select className="form-control" value={postForm.event}
                    onChange={(e) => setPostForm((f) => ({ ...f, event: e.target.value }))}>
                    <option value="">-- None --</option>
                    {events?.map((event) => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input className="form-control" value={postForm.title}
                  onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Body</label>
                <textarea className="form-control" value={postForm.body}
                  onChange={(e) => setPostForm((f) => ({ ...f, body: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Photos {editingPostId ? '(adds more photos, existing ones stay)' : '(optional, multiple allowed)'}</label>
                <input
                  type="file" accept="image/*" multiple className="form-control"
                  value=""
                  onChange={(e) => addPostPhotos(e.target.files)}
                />
                {postPhotos.length > 0 && (
                  <div className="photo-picker-preview">
                    {postPhotos.map(({ file, url }, i) => (
                      <div className="photo-picker-thumb" key={url}>
                        <img src={url} alt={file.name} />
                        <button
                          type="button"
                          className="photo-picker-remove"
                          title="Remove photo"
                          onClick={() => removePostPhoto(i)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {postError && <p className="form-error-banner">{postError}</p>}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" type="submit" disabled={postCreating}>
                  {postCreating ? 'Saving…' : editingPostId ? 'Save Changes' : 'Publish Post'}
                </button>
                {editingPostId && (
                  <button className="btn btn-secondary" type="button" onClick={cancelEditPost}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </article>

        <article className="card overview-card">
          <div className="card-header">
            <div><h3>Existing Community Posts</h3></div>
          </div>
          <div className="card-content" style={{ overflowX: 'auto' }}>
            {!posts && <p className="loading-state">Loading…</p>}
            {posts && posts.length === 0 && <p className="empty-state">No posts yet.</p>}
            {posts && posts.length > 0 && (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Title</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Type</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Likes</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Posted</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#9cb3d8' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{post.title}</td>
                      <td style={{ padding: '1rem 0.5rem', textTransform: 'capitalize' }}>{post.post_type}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{post.likes_count}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(post.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <button className="action-btn btn-edit" onClick={() => handleEditPost(post)}>Edit</button>
                        <button className="action-btn btn-delete" onClick={() => setDeletePostTarget(post.id)}>Delete</button>
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
          <div className="modal-content" style={{ maxWidth: '1200px' }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#d8e4ff', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Bib #</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Name</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Category</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Distance</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Role</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Team</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Gender</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Date of Birth</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Shirt Size</th>
                    <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsModal.participants.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: '0.8rem' }}>No participants yet.</td></tr>
                  )}
                  {participantsModal.participants.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.bib_number || '—'}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.full_name}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{p.category}</td>
                      <td style={{ padding: '0.8rem' }}>{p.distance || '—'}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{p.role || '—'}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{p.team_name || '—'}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{p.status}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{p.gender}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{p.date_of_birth}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{p.shirt_size}</td>
                      <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{p.mobile_number || p.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteEventTarget !== null}
        title="Delete event"
        message="Delete this event? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteEvent}
        onCancel={() => setDeleteEventTarget(null)}
      />

      <ConfirmDialog
        open={deletePostTarget !== null}
        title="Delete community post"
        message="Delete this post from the community feed? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeletePost}
        onCancel={() => setDeletePostTarget(null)}
      />
    </DashboardLayout>
  );
}
