import { stateSchema, type Activity, type PlannerState, type Trip } from './model';
export type PlannerAction =
  | { type: 'create-trip'; trip: Trip }
  | { type: 'update-trip'; trip: Trip }
  | { type: 'delete-trip'; tripId: string }
  | { type: 'add-activity'; tripId: string; activity: Activity }
  | { type: 'delete-activity'; tripId: string; activityId: string }
  | { type: 'vote'; tripId: string; activityId: string; member: string }
  | { type: 'schedule'; tripId: string; activityId: string; day: string | null };
export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  let next: PlannerState;
  if (action.type === 'create-trip') next = { ...state, trips: [...state.trips, action.trip] };
  else if (action.type === 'delete-trip')
    next = { ...state, trips: state.trips.filter((t) => t.id !== action.tripId) };
  else
    next = {
      ...state,
      trips: state.trips.map((trip) => {
        if (action.type === 'update-trip') return trip.id === action.trip.id ? action.trip : trip;
        if (trip.id !== action.tripId) return trip;
        if (action.type === 'add-activity')
          return { ...trip, activities: [...trip.activities, action.activity] };
        return {
          ...trip,
          activities: trip.activities.flatMap((activity) => {
            if (activity.id !== action.activityId) return [activity];
            if (action.type === 'delete-activity') return [];
            if (action.type === 'schedule') return [{ ...activity, day: action.day }];
            if (!trip.members.includes(action.member)) return [activity];
            return [
              {
                ...activity,
                votes: activity.votes.includes(action.member)
                  ? activity.votes.filter((v) => v !== action.member)
                  : [...activity.votes, action.member],
              },
            ];
          }),
        };
      }),
    };
  return stateSchema.parse(next);
}
