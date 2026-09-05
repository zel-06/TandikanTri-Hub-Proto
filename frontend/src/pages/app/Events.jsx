import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthNavbar from '../../components/AuthNavbar';
import Footer from '../../components/Footer';
import * as eventsApi from '../../api/events';

const DISCIPLINE_LABEL = {
  marathon: 'Marathon',
  duathlon: 'Duathlon',
  triathlon: 'Triathlon',
};

const DISCIPLINE_SEGMENTS = {
  marathon: 'Run Events',
  duathlon: 'Run, Bike Events',
  triathlon: 'Swim, Bike, Run Events',
};

function raceFormat(categories) {
  const formats = [];
  if (categories.some((c) => !c.is_relay)) formats.push('Solo');
  if (categories.some((c) => c.is_relay)) formats.push('Relay');
  return formats.join(', ') || 'TBA';
}

export default function Events() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    eventsApi.listEvents().then(setEvents).catch(() => setError('Could not load events.'));
  }, []);

  return (
    <>
      <AuthNavbar />
      <main className="section events-directory">
        <div className="section-content">
          <div className="events-header">
            <div>
              <p className="eyebrow">Events Directory</p>
              <h2>Find your next race</h2>
            </div>
          </div>

          {error && <p className="form-error-banner">{error}</p>}
          {!events && !error && <p className="loading-state">Loading events…</p>}
          {events && events.length === 0 && <p className="empty-state">No events published yet.</p>}

          <div className="events-list">
            {events?.map((event) => {
              const slotsLeft = event.categories.reduce((sum, c) => sum + c.slots_left, 0);
              const totalSlots = event.categories.reduce((sum, c) => sum + c.total_slots, 0);
              return (
                <article key={event.id} className="event-card">
                  <div
                    className="event-card-left"
                    style={event.hero_image ? {
                      backgroundImage: `linear-gradient(180deg, rgba(8,17,38,0.35) 0%, rgba(11,21,48,0.85) 100%), url(${event.hero_image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : undefined}
                  >
                    <span className="event-label">{DISCIPLINE_LABEL[event.discipline] || event.discipline}</span>
                    <h3>{event.title}</h3>
                    <p className="event-meta">
                      {new Date(event.date).toLocaleDateString()} · {event.venue}
                    </p>
                  </div>

                  <div className="event-card-right">
                    <div className="event-tags">
                      <span className="event-pill event-pill-blue">
                        {DISCIPLINE_SEGMENTS[event.discipline] || DISCIPLINE_LABEL[event.discipline]}
                      </span>
                      {totalSlots > 0 && (
                        <span className="event-pill event-pill-green">{slotsLeft} slots left</span>
                      )}
                    </div>

                    <p className="event-description">{event.description}</p>

                    <div className="event-card-footer">
                      <p className="event-categories">
                        Race Format: <strong>{raceFormat(event.categories)}</strong>
                      </p>
                      <Link to={`/events/${event.id}`} className="event-view-btn">View Details</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
