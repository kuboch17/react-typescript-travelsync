import { useState, type FormEvent } from 'react';
import {
  categories,
  tripSchema,
  activitySchema,
  type Trip,
  type TripInput,
  type ActivityInput,
} from '../domain/model';
export function TripForm({
  trip,
  uid,
  pending,
  onSave,
}: {
  trip?: Trip;
  uid: string;
  pending?: boolean;
  onSave: (input: TripInput) => void;
}) {
  const [error, setError] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input: TripInput = {
      title: String(f.get('title')),
      destination: String(f.get('destination')),
      start: String(f.get('start')),
      end: String(f.get('end')),
    };
    const result = tripSchema.safeParse({
      ...input,
      id: trip?.id ?? 'new',
      ownerUid: trip?.ownerUid ?? uid,
      code: trip?.code ?? '0'.repeat(32),
      members: trip?.members ?? [uid],
      activities: trip?.activities ?? [],
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onSave({
      title: result.data.title,
      destination: result.data.destination,
      start: result.data.start,
      end: result.data.end,
    });
  }
  return (
    <form onSubmit={submit} className="form">
      <label>
        Trip name
        <input
          name="title"
          placeholder="Trip name"
          defaultValue={trip?.title}
          maxLength={80}
          required
        />
      </label>
      <label>
        Destination
        <input
          name="destination"
          placeholder="City, country"
          defaultValue={trip?.destination}
          maxLength={100}
          required
        />
      </label>
      <div className="form-row">
        <label>
          From
          <input name="start" type="date" defaultValue={trip?.start} required />
        </label>
        <label>
          Until
          <input name="end" type="date" defaultValue={trip?.end} required />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={pending}>
        {trip ? 'Save trip' : 'Create trip'}
      </button>
    </form>
  );
}
export function ActivityForm({
  onSave,
  pending,
}: {
  pending?: boolean;
  onSave: (input: ActivityInput) => void;
}) {
  const [error, setError] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const result = activitySchema.safeParse({
      id: 'new',
      title: f.get('title'),
      location: f.get('location'),
      category: f.get('category'),
      cost: Number(f.get('cost')),
      notes: f.get('notes'),
      day: null,
      votes: [],
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    const { title, location, category, cost, notes, day } = result.data;
    onSave({ title, location, category, cost, notes, day });
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        What's the idea?
        <input name="title" placeholder="Sunset by the river" maxLength={100} required />
      </label>
      <label>
        Place
        <input name="location" placeholder="Place" maxLength={120} required />
      </label>
      <div className="form-row">
        <label>
          Category
          <select name="category">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Cost per person (€)
          <input
            name="cost"
            type="number"
            defaultValue={0}
            min={0}
            max={100000}
            step="0.01"
            required
          />
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" placeholder="Optional" maxLength={500} rows={3} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={pending}>
        Add idea
      </button>
    </form>
  );
}
