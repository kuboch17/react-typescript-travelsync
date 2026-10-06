import { useCallback, useMemo, useState } from 'react';
import {
  Mountain,
  Plus,
  MapPin,
  ArrowUpRight,
  Compass,
  CalendarDays,
  Lightbulb,
  Download,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Check,
  Users,
} from 'lucide-react';
import { usePlanner } from './hooks/usePlanner';
import {
  categories,
  formatDate,
  money,
  tripDays,
  type TripInput,
  type ActivityInput,
} from './domain/model';
import { Modal } from './components/Modal';
import { TripForm, ActivityForm } from './components/Forms';
import { ActivityCard } from './components/ActivityCard';
type Dialog = 'new-trip' | 'edit-trip' | 'idea' | 'delete-trip' | null;
export default function App() {
  const { state, dispatch, warning } = usePlanner();
  const [selected, setSelected] = useState('lisbon');
  const [identity, setIdentity] = useState('Jakub');
  const [view, setView] = useState<'ideas' | 'itinerary'>('ideas');
  const [filter, setFilter] = useState('All ideas');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = useCallback(() => setDialog(null), []);
  const trip = state.trips.find((t) => t.id === selected) ?? state.trips[0];
  const member = trip?.members.includes(identity) ? identity : (trip?.members[0] ?? '');
  const planned = trip?.activities.filter((a) => a.day) ?? [];
  const activities = useMemo(
    () =>
      trip?.activities
        .filter(
          (a) =>
            (filter === 'All ideas' || a.category === filter) &&
            `${a.title} ${a.location}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => (sort === 'popular' ? b.votes.length - a.votes.length : a.cost - b.cost)) ??
      [],
    [trip, filter, query, sort],
  );
  function saveTrip(input: TripInput) {
    if (dialog === 'edit-trip' && trip)
      dispatch({
        type: 'update-trip',
        trip: {
          ...trip,
          ...input,
          activities: trip.activities.map((a) => ({
            ...a,
            votes: a.votes.filter((v) => input.members.includes(v)),
          })),
        },
      });
    else {
      const id = crypto.randomUUID();
      dispatch({ type: 'create-trip', trip: { ...input, id, activities: [] } });
      setSelected(id);
      setIdentity(input.members[0]);
    }
    close();
  }
  function saveIdea(input: ActivityInput) {
    if (trip)
      dispatch({
        type: 'add-activity',
        tripId: trip.id,
        activity: { ...input, id: crypto.randomUUID(), votes: [] },
      });
    close();
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tripsync-backup.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function selectTrip(id: string) {
    setSelected(id);
    setFilter('All ideas');
    setQuery('');
    setView('ideas');
  }
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to trip
      </a>
      <aside className="sidebar">
        <a href="#" className="brand" aria-label="TripSync home">
          <span className="brand-icon">
            <Mountain size={22} />
          </span>
          TripSync<span className="brand-dot">.</span>
        </a>
        <p className="sidebar-label">YOUR WORKSPACE</p>
        <div className="workspace">
          <Compass size={18} />
          My trips<span>{state.trips.length}</span>
        </div>
        <div className="sidebar-heading">
          <p className="sidebar-label">UPCOMING ADVENTURES</p>
          <button
            className="icon-button"
            aria-label="Create trip"
            onClick={() => setDialog('new-trip')}
          >
            <Plus size={17} />
          </button>
        </div>
        <nav aria-label="Your trips">
          {state.trips.map((t) => (
            <button
              key={t.id}
              className={`trip-nav ${trip?.id === t.id ? 'active' : ''}`}
              onClick={() => selectTrip(t.id)}
            >
              <span className="trip-emoji">
                {t.destination.toLowerCase().includes('lisbon')
                  ? '☀'
                  : t.destination.toLowerCase().includes('vienna')
                    ? '♧'
                    : '↗'}
              </span>
              <span>
                <strong>{t.destination.split(',')[0]}</strong>
                <small>
                  {formatDate(t.start)} – {formatDate(t.end)}
                </small>
              </span>
            </button>
          ))}
        </nav>
        <button className="new-trip" onClick={() => setDialog('new-trip')}>
          <Plus size={16} />
          Plan a new trip
        </button>
        <div className="sidebar-bottom">
          <div className="note-illustration">
            <Mountain size={33} />
            <span>✦</span>
          </div>
          <h3>
            Good trips start
            <br />
            with a shared idea.
          </h3>
          <p>
            A little less planning.
            <br />A lot more exploring.
          </p>
          <div className="local-note">
            <span />
            Local demo · saved in this browser
          </div>
        </div>
        <div className="profile">
          <span className="avatar jakub">J</span>
          <div>
            <strong>Jakub's workspace</strong>
            <small>Personal portfolio demo</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            My trips <span>/</span>{' '}
            <strong>{trip?.destination.split(',')[0] ?? 'New adventure'}</strong>
          </div>
          <button className="text-button" onClick={exportBackup}>
            <Download size={16} />
            Export backup
          </button>
        </header>
        <main id="main">
          <div className="eyebrow">
            <span />
            MAKE ROOM FOR THE MEMORIES
          </div>
          {trip ? (
            <>
              <section className="trip-heading">
                <div>
                  <h1>{trip.title}</h1>
                  <p>
                    <MapPin size={16} />
                    {trip.destination}
                    <span className="separator">·</span>
                    <CalendarDays size={16} />
                    {formatDate(trip.start)} –{' '}
                    {formatDate(trip.end, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button className="outline edit-trip" onClick={() => setDialog('edit-trip')}>
                  <Pencil size={15} />
                  Edit trip
                </button>
              </section>
              <section className="trip-banner">
                <div className="banner-copy">
                  <span className="pill">THE NEXT CHAPTER</span>
                  <h2>
                    Different ideas.
                    <br />
                    One great adventure.
                  </h2>
                  <p>
                    Collect the possibilities. Vote on your favourites.
                    <br />
                    Make a plan everyone is excited about.
                  </p>
                  <div className="banner-members">
                    <div className="avatar-stack">
                      {trip.members.slice(0, 4).map((m, i) => (
                        <span key={m} className={`avatar color-${i}`} title={m}>
                          {m[0].toUpperCase()}
                        </span>
                      ))}
                    </div>
                    <span>{trip.members.length} travel companions</span>
                  </div>
                </div>
                <div className="travel-art" aria-hidden="true">
                  <div className="sun" />
                  <div className="art-caption">
                    LET'S GO
                    <br />
                    <b>{trip.destination.split(',')[0].toUpperCase()}</b>
                    <ArrowUpRight size={28} />
                  </div>
                  <div className="building one">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="building two">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="building three">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="art-hill" />
                  <div className="art-line" />
                </div>
              </section>
              <section className="stats" aria-label="Trip overview">
                <div>
                  <span className="stat-icon">
                    <Lightbulb size={19} />
                  </span>
                  <div>
                    <b>{trip.activities.length}</b>
                    <span>Ideas to explore</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon">
                    <Check size={19} />
                  </span>
                  <div>
                    <b>{planned.length}</b>
                    <span>Added to the plan</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon">
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <b>
                      {tripDays(trip).length}
                      <small> days</small>
                    </b>
                    <span>Time for adventure</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon">€</span>
                  <div>
                    <b>{money(planned.reduce((s, a) => s + a.cost, 0))}</b>
                    <span>Planned activities / person</span>
                  </div>
                </div>
              </section>
              <section className="planning">
                <div className="planning-header">
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="Planning view"
                    onKeyDown={(event) => {
                      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                      event.preventDefault();
                      const next =
                        event.key === 'Home'
                          ? 'ideas'
                          : event.key === 'End'
                            ? 'itinerary'
                            : view === 'ideas'
                              ? 'itinerary'
                              : 'ideas';
                      setView(next);
                      document.getElementById(`${next}-tab`)?.focus();
                    }}
                  >
                    <button
                      role="tab"
                      id="ideas-tab"
                      aria-controls="planning-panel"
                      tabIndex={view === 'ideas' ? 0 : -1}
                      aria-selected={view === 'ideas'}
                      onClick={() => setView('ideas')}
                    >
                      <Lightbulb size={17} />
                      Ideas board<span>{trip.activities.length}</span>
                    </button>
                    <button
                      role="tab"
                      id="itinerary-tab"
                      aria-controls="planning-panel"
                      tabIndex={view === 'itinerary' ? 0 : -1}
                      aria-selected={view === 'itinerary'}
                      onClick={() => setView('itinerary')}
                    >
                      <CalendarDays size={17} />
                      Itinerary
                    </button>
                  </div>
                  <button className="primary" onClick={() => setDialog('idea')}>
                    <Plus size={17} />
                    Add an idea
                  </button>
                </div>
                <div className="collaboration-row">
                  <p>
                    {view === 'ideas'
                      ? 'A wish list becomes a plan, one vote at a time.'
                      : 'Your adventure, one day at a time.'}
                  </p>
                  <label>
                    <Users size={14} />
                    Demo voting as
                    <select
                      aria-label="Demo voting identity"
                      value={member}
                      onChange={(e) => setIdentity(e.target.value)}
                    >
                      {trip.members.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div
                  id="planning-panel"
                  role="tabpanel"
                  aria-labelledby={view === 'ideas' ? 'ideas-tab' : 'itinerary-tab'}
                >
                  {view === 'ideas' ? (
                    <>
                      <div className="board-tools">
                        <div className="filters" aria-label="Filter ideas">
                          {['All ideas', ...categories].map((c) => (
                            <button
                              key={c}
                              aria-pressed={filter === c}
                              className={filter === c ? 'selected' : ''}
                              onClick={() => setFilter(c)}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                        <label className="sort">
                          <SlidersHorizontal size={14} />
                          <select
                            aria-label="Sort ideas"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                          >
                            <option value="popular">Most popular</option>
                            <option value="cost">Lowest cost</option>
                          </select>
                        </label>
                      </div>
                      <input
                        className="search"
                        aria-label="Search ideas"
                        placeholder="Find an idea or place…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <div className="activity-grid">
                        {activities.map((a) => (
                          <ActivityCard
                            key={a.id}
                            activity={a}
                            trip={trip}
                            member={member}
                            onVote={() =>
                              dispatch({ type: 'vote', tripId: trip.id, activityId: a.id, member })
                            }
                            onSchedule={(day) =>
                              dispatch({ type: 'schedule', tripId: trip.id, activityId: a.id, day })
                            }
                            onDelete={() =>
                              dispatch({
                                type: 'delete-activity',
                                tripId: trip.id,
                                activityId: a.id,
                              })
                            }
                          />
                        ))}
                        {!query && filter === 'All ideas' && (
                          <button className="add-card" onClick={() => setDialog('idea')}>
                            <span>
                              <Plus size={24} />
                            </span>
                            <strong>What's on your wish list?</strong>
                            <small>A place, a bite, a little adventure.</small>
                            <b>
                              Add an idea <ArrowUpRight size={15} />
                            </b>
                          </button>
                        )}
                      </div>
                      {activities.length === 0 && (
                        <p className="empty">
                          {trip.activities.length
                            ? 'No ideas match. Try another search or category.'
                            : 'Your next adventure starts with the first idea.'}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="itinerary">
                      {tripDays(trip).map((day, i) => (
                        <section key={day} className="day">
                          <div className="day-label">
                            <span>DAY {i + 1}</span>
                            <h3>
                              {formatDate(day, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </h3>
                          </div>
                          <div>
                            {planned
                              .filter((a) => a.day === day)
                              .map((a) => (
                                <div key={a.id} className="itinerary-item">
                                  <span className={`tag ${a.category.split(' ')[0].toLowerCase()}`}>
                                    {a.category}
                                  </span>
                                  <h4>{a.title}</h4>
                                  <p>
                                    {a.location} · {money(a.cost)} / person
                                  </p>
                                  <button
                                    className="text-button"
                                    aria-label={`Unplan ${a.title}`}
                                    onClick={() =>
                                      dispatch({
                                        type: 'schedule',
                                        tripId: trip.id,
                                        activityId: a.id,
                                        day: null,
                                      })
                                    }
                                  >
                                    Remove from plan
                                  </button>
                                </div>
                              ))}
                            {!planned.some((a) => a.day === day) && (
                              <p className="day-empty">
                                A little room for spontaneity. Add an idea from the board.
                              </p>
                            )}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              <footer>
                <span>
                  <Check size={13} />
                  Local demo. Switching companions simulates votes; no live sharing.
                </span>
                <button className="text-button danger" onClick={() => setDialog('delete-trip')}>
                  <Trash2 size={13} />
                  Delete trip
                </button>
              </footer>
            </>
          ) : (
            <section className="empty-workspace">
              <Compass size={48} />
              <h1>Where shall we go?</h1>
              <p>Create a trip and start collecting ideas together.</p>
              <button className="primary" onClick={() => setDialog('new-trip')}>
                <Plus size={17} />
                Plan your first trip
              </button>
            </section>
          )}
          {warning && (
            <div className="warning" role="alert">
              {warning}
            </div>
          )}
        </main>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === 'new-trip'
              ? 'Start a new adventure'
              : dialog === 'edit-trip'
                ? 'Edit your trip'
                : dialog === 'idea'
                  ? 'A new possibility'
                  : 'Delete this trip?'
          }
          onClose={close}
        >
          {dialog === 'new-trip' || dialog === 'edit-trip' ? (
            <TripForm trip={dialog === 'edit-trip' ? trip : undefined} onSave={saveTrip} />
          ) : dialog === 'idea' ? (
            <ActivityForm onSave={saveIdea} />
          ) : (
            <>
              <p>
                This removes the trip and all its ideas from this browser. Export a backup first if
                you want to keep a copy.
              </p>
              <div className="dialog-actions">
                <button className="outline" onClick={close}>
                  Keep trip
                </button>
                <button
                  className="primary destructive"
                  onClick={() => {
                    if (trip) dispatch({ type: 'delete-trip', tripId: trip.id });
                    close();
                  }}
                >
                  Delete trip
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
