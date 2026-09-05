import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthNavbar from '../../components/AuthNavbar';
import Footer from '../../components/Footer';
import * as eventsApi from '../../api/events';
import '../../styles/event-detail.css';

const DISCIPLINE_LABEL = {
  marathon: 'Marathon',
  duathlon: 'Duathlon',
  triathlon: 'Triathlon',
};

function formatTime(time) {
  if (!time) return null;
  const [hourStr, minute] = time.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${minute} ${period}`;
}

function remaining(deadline) {
  const diff = new Date(deadline + 'T23:59:59') - new Date();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function CountdownTimer({ deadline }) {
  const [time, setTime] = useState(() => remaining(deadline));

  useEffect(() => {
    const id = setInterval(() => setTime(remaining(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <div className="countdown-timer">
      <p className="countdown-label">Registration ends in</p>
      <div className="countdown-boxes">
        <div className="countdown-box"><span>{pad(time.days)}</span><small>Days</small></div>
        <div className="countdown-box"><span>{pad(time.hours)}</span><small>Hours</small></div>
        <div className="countdown-box"><span>{pad(time.mins)}</span><small>Mins.</small></div>
        <div className="countdown-box"><span>{pad(time.secs)}</span><small>Secs.</small></div>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    eventsApi.getEvent(id)
      .then((data) => {
        setEvent(data);
        if (data.categories.length) setSelectedCategoryId(data.categories[0].id);
      })
      .catch(() => setError('Could not load this event.'));
  }, [id]);

  if (error) return <ErrorShell message={error} />;
  if (!event) return <ErrorShell message="Loading event…" />;

  const selectedCategory = event.categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="event-detail-page">
      <AuthNavbar />

      <section className="event-hero">
        <div className="section-content">
          <span className="event-hero-tag">{DISCIPLINE_LABEL[event.discipline] || event.discipline}</span>
          <h1 className="event-hero-title">{event.title}</h1>
          <div className="event-hero-meta">
            <span>📅 {new Date(event.date).toLocaleDateString()}</span>
            <span>📍 {event.venue}</span>
          </div>

          {event.hero_image && (
            <div className="event-hero-photo">
              <img src={event.hero_image} alt={event.title} />
            </div>
          )}
        </div>
      </section>

      <section className="event-detail-main">
        <div className="section-content event-detail-grid">
          <article className="event-summary-card">
            <div className="card-heading"><h2>About this Event</h2></div>
            <p>{event.description || 'Details for this event will be announced soon.'}</p>

            <div className="event-summary-stats">
              <div>
                <div className="stat-label">Categories</div>
                <strong>{event.categories.map((c) => c.name).join(', ') || 'TBA'}</strong>
              </div>
              <div>
                <div className="stat-label">Distance</div>
                <strong>{event.distance || 'TBA'}</strong>
              </div>
              <div>
                <div className="stat-label">Time</div>
                <strong>{formatTime(event.time) || 'TBA'}</strong>
              </div>
            </div>
          </article>

          <aside className="event-register-card category-card">
            <div className="card-heading"><h3>Choose your category</h3></div>

            {event.categories.length === 0 && (
              <p style={{ padding: '25px 35px', color: '#333' }}>Categories coming soon.</p>
            )}

            {event.categories.map((category) => (
              <label
                key={category.id}
                className={`category-option${selectedCategoryId === category.id ? ' selected' : ''}`}
              >
                <div className="category-left">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategoryId === category.id}
                    onChange={() => setSelectedCategoryId(category.id)}
                  />
                  <div>
                    <h3>{category.name}</h3>
                    {category.is_relay && (
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#5f6f89' }}>
                        Relay roles: {category.relay_roles.join(', ')}
                      </p>
                    )}
                    <p><span>₱{Number(category.fee).toLocaleString()}</span></p>

                    {category.kit_inclusions && (
                      <div className="kit-inclusions">
                        <small>Race Kit Inclusions:</small>
                        <ul>
                          {category.kit_inclusions.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="category-right">
                  <div className={`slots-left${category.slots_left <= 0 ? ' full' : ''}`}>
                    {category.slots_left <= 0 ? 'Fully Booked' : `${category.slots_left} Slots Left`}
                  </div>
                  {category.registration_deadline && (
                    <CountdownTimer deadline={category.registration_deadline} />
                  )}
                  <div className="price-box">
                    ₱{Number(category.fee).toLocaleString()}
                    {category.registration_deadline && (
                      <> (Regular) until {new Date(category.registration_deadline).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}</>
                    )}
                  </div>
                </div>
              </label>
            ))}

            {selectedCategory && (
              <div className="register-link-wrap">
                <button
                  className="register-category-btn"
                  type="button"
                  disabled={selectedCategory.slots_left <= 0}
                  onClick={() => navigate(`/events/${event.id}/register/${selectedCategory.id}`)}
                >
                  {selectedCategory.slots_left <= 0 ? 'Fully Booked' : 'Register Now'}
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ErrorShell({ message }) {
  return (
    <div className="event-detail-page">
      <AuthNavbar />
      <main className="section-content" style={{ padding: '4rem 20px' }}><p>{message}</p></main>
      <Footer />
    </div>
  );
}
