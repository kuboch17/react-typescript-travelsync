import { ArrowUp, MapPin, Trash2, CalendarPlus, Check } from 'lucide-react';
import { formatDate, money, tripDays, type Activity, type Trip } from '../domain/model';
export function ActivityCard({
  activity,
  trip,
  member,
  onVote,
  onSchedule,
  onDelete,
}: {
  activity: Activity;
  trip: Trip;
  member: string;
  onVote: () => void;
  onSchedule: (day: string | null) => void;
  onDelete: () => void;
}) {
  const voted = activity.votes.includes(member);
  return (
    <article className="activity-card">
      <div className="card-top">
        <span className={`tag ${activity.category.split(' ')[0].toLowerCase()}`}>
          {activity.category}
        </span>
        <button
          className="icon-button delete"
          aria-label={`Delete ${activity.title}`}
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <h3>{activity.title}</h3>
      <p className="location">
        <MapPin size={14} />
        {activity.location}
      </p>
      <p className="notes">{activity.notes || 'A new idea for your next adventure.'}</p>
      <div className="card-meta">
        <span>{activity.cost === 0 ? 'Free to explore' : `${money(activity.cost)} / person`}</span>
        {activity.day && (
          <span className="planned">
            <Check size={12} />
            In the plan
          </span>
        )}
      </div>
      <div className="card-footer">
        <button
          className={`vote ${voted ? 'voted' : ''}`}
          aria-pressed={voted}
          aria-label={`${voted ? 'Remove vote from' : 'Vote for'} ${activity.title}`}
          onClick={onVote}
        >
          <ArrowUp size={16} />
          <b>{activity.votes.length}</b>
          <span>{voted ? 'Voted' : 'Vote'}</span>
        </button>
        <label className="schedule">
          <CalendarPlus size={15} />
          <select
            aria-label={`Schedule ${activity.title}`}
            value={activity.day ?? ''}
            onChange={(e) => onSchedule(e.target.value || null)}
          >
            <option value="">Add to plan</option>
            {tripDays(trip).map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}
