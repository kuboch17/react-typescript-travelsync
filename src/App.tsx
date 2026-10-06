import { useCallback, useMemo, useState } from 'react';
import {
  Plus,
  MapPin,
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
import { useAuth } from './hooks/useAuth';
import { configured } from './data/firebase';
import { AuthForm } from './components/AuthForm';
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
  const session = useAuth();
  const { state, dispatch, warning, loading, pending, join } = usePlanner(
    session.user?.uid ?? null,
  );
  const [joinCode, setJoinCode] = useState('');
  const [selected, setSelected] = useState('');

  const [view, setView] = useState<'ideas' | 'itinerary'>('ideas');
  const [filter, setFilter] = useState('All ideas');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = useCallback(() => setDialog(null), []);
  const trip = state.trips.find((t) => t.id === selected) ?? state.trips[0];
  const member = session.user?.uid ?? '';
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
  async function saveTrip(input: TripInput) {
    if (!session.user) return;
    if (dialog === 'edit-trip' && trip) {
      if (await dispatch({ type: 'update-trip', trip: { ...trip, ...input } })) close();
    } else {
      const id = crypto.randomUUID();
      const code = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      if (
        await dispatch({
          type: 'create-trip',
          trip: { ...input, id, ownerUid: member, code, members: [member], activities: [] },
        })
      ) {
        setSelected(id);
        close();
      }
    }
  }
  async function saveIdea(input: ActivityInput) {
    if (
      trip &&
      (await dispatch({
        type: 'add-activity',
        tripId: trip.id,
        activity: { ...input, id: crypto.randomUUID(), votes: [] },
      }))
    )
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
  if (!configured)
    return (
      <section className="auth-panel">
        <h1>TripSync setup</h1>
        <p>
          Firebase configuration is missing. Copy .env.example to .env.local, fill in your Firebase
          web app values and restart. See README for setup.
        </p>
      </section>
    );
  if (session.loading)
    return (
      <p className="empty" role="status">
        Loading session…
      </p>
    );
  if (!session.user)
    return (
      <AuthForm onSubmit={session.authenticate} pending={session.pending} error={session.error} />
    );
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to trip
      </a>
      <aside className="sidebar">
        <div className="sidebar-heading">
          <h2>
            <Compass size={20} /> My trips
          </h2>
          <button
            className="icon-button"
            aria-label="Create trip"
            onClick={() => setDialog('new-trip')}
          >
            <Plus size={20} />
          </button>
        </div>
        <form
          className="join-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const id = await join(joinCode.trim().toLowerCase());
            if (id) {
              selectTrip(id);
              setJoinCode('');
            }
          }}
        >
          <label>
            Trip code
            <input
              aria-label="Trip code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              required
              maxLength={32}
            />
          </label>
          <button className="outline" disabled={pending}>
            Join trip
          </button>
        </form>
        <nav aria-label="Your trips">
          {state.trips.map((t) => (
            <button
              key={t.id}
              className={`trip-nav ${trip?.id === t.id ? 'active' : ''}`}
              onClick={() => selectTrip(t.id)}
            >
              <MapPin size={18} aria-hidden="true" />
              <span>
                <strong>{t.destination.split(',')[0]}</strong>
                <small>
                  {formatDate(t.start)} – {formatDate(t.end)}
                </small>
              </span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            My trips <span>/</span>{' '}
            <strong>{trip?.destination.split(',')[0] ?? 'New adventure'}</strong>
          </div>
          <span>{session.user.email}</span>
          <button
            className="text-button"
            disabled={session.pending}
            onClick={() => {
              close();
              void session.logout();
            }}
          >
            Sign out
          </button>
          <button className="text-button" onClick={exportBackup}>
            <Download size={16} />
            Export backup
          </button>
        </header>
        <main id="main">
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
              <section className="stats" aria-label="Trip overview">
                <div>
                  <span className="stat-icon">
                    <Lightbulb size={19} />
                  </span>
                  <div>
                    <b>{trip.activities.length}</b>
                    <span>Ideas</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon">
                    <Check size={19} />
                  </span>
                  <div>
                    <b>{planned.length}</b>
                    <span>Planned</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon">
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <b>{tripDays(trip).length}</b>
                    <span>Days</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon">€</span>
                  <div>
                    <b>{money(planned.reduce((s, a) => s + a.cost, 0))}</b>
                    <span>Cost / person</span>
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
                  <Users size={14} />
                  <span>
                    {trip.members.length} members · Share trip code: <code>{trip.code}</code>
                  </span>
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
                      </div>
                      {activities.length === 0 && (
                        <p className="empty">
                          {trip.activities.length ? 'No matching ideas.' : 'No ideas yet.'}
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
                              <p className="day-empty">No activities planned.</p>
                            )}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              <footer>
                <span>Realtime · Firebase</span>
                {trip.ownerUid === member && (
                  <button className="text-button danger" onClick={() => setDialog('delete-trip')}>
                    <Trash2 size={13} />
                    Delete trip
                  </button>
                )}
              </footer>
            </>
          ) : (
            <section className="empty-workspace">
              <Compass size={48} />
              <h1>{loading ? 'Loading trips…' : 'No trips yet'}</h1>
              <button className="primary" onClick={() => setDialog('new-trip')}>
                <Plus size={17} />
                Create trip
              </button>
            </section>
          )}
          {(warning || session.error) && (
            <div className="warning" role="alert">
              {warning || session.error}
            </div>
          )}
        </main>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === 'new-trip'
              ? 'Create trip'
              : dialog === 'edit-trip'
                ? 'Edit trip'
                : dialog === 'idea'
                  ? 'Add idea'
                  : 'Delete this trip?'
          }
          onClose={close}
        >
          {dialog === 'new-trip' || dialog === 'edit-trip' ? (
            <TripForm
              pending={pending}
              uid={member}
              trip={dialog === 'edit-trip' ? trip : undefined}
              onSave={saveTrip}
            />
          ) : dialog === 'idea' ? (
            <ActivityForm pending={pending} onSave={saveIdea} />
          ) : (
            <>
              <p>The trip and its ideas will be deleted.</p>
              <div className="dialog-actions">
                <button className="outline" onClick={close}>
                  Keep trip
                </button>
                <button
                  className="primary destructive"
                  disabled={pending}
                  onClick={async () => {
                    if (trip && (await dispatch({ type: 'delete-trip', tripId: trip.id }))) close();
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
