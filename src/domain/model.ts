import { z } from 'zod';

export const categories = ['Food & drink', 'Culture', 'Outdoors', 'Experience'] as const;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const parsed = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
  }, 'Enter a valid date');
export const activitySchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(100),
  location: z.string().trim().min(1).max(120),
  category: z.enum(categories),
  cost: z.number().finite().min(0).max(100000),
  notes: z.string().max(500),
  votes: z.array(z.string()),
  day: date.nullable(),
});
export const tripSchema = z
  .object({
    id: z.string(),
    title: z.string().trim().min(1).max(80),
    destination: z.string().trim().min(1).max(100),
    start: date,
    end: date,
    members: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    activities: z.array(activitySchema),
  })
  .superRefine((trip, ctx) => {
    if (trip.end < trip.start || daysBetween(trip.start, trip.end) > 30)
      ctx.addIssue({
        code: 'custom',
        message: 'Trips must last between 1 and 31 days',
        path: ['end'],
      });
    if (new Set(trip.members).size !== trip.members.length)
      ctx.addIssue({ code: 'custom', message: 'Member names must be unique', path: ['members'] });
    if (new Set(trip.activities.map((a) => a.id)).size !== trip.activities.length)
      ctx.addIssue({ code: 'custom', message: 'Activity IDs must be unique' });
    for (const activity of trip.activities) {
      if (activity.day && (activity.day < trip.start || activity.day > trip.end))
        ctx.addIssue({ code: 'custom', message: 'Activity date is outside the trip' });
      if (
        new Set(activity.votes).size !== activity.votes.length ||
        activity.votes.some((v) => !trip.members.includes(v))
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid activity votes' });
    }
  });
export const stateSchema = z
  .object({ version: z.literal(1), trips: z.array(tripSchema) })
  .refine(
    (s) => new Set(s.trips.map((t) => t.id)).size === s.trips.length,
    'Trip IDs must be unique',
  );
export type Activity = z.infer<typeof activitySchema>;
export type Trip = z.infer<typeof tripSchema>;
export type PlannerState = z.infer<typeof stateSchema>;
export type TripInput = Pick<Trip, 'title' | 'destination' | 'start' | 'end' | 'members'>;
export type ActivityInput = Omit<Activity, 'id' | 'votes'>;
export function daysBetween(start: string, end: string) {
  return (Date.parse(end) - Date.parse(start)) / 86400000;
}
export function tripDays(trip: Trip): string[] {
  return Array.from({ length: daysBetween(trip.start, trip.end) + 1 }, (_, i) =>
    new Date(Date.parse(trip.start) + i * 86400000).toISOString().slice(0, 10),
  );
}
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });
}
export const money = (value: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
