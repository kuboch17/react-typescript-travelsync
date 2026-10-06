import { describe, it, expect } from 'vitest';
import type { PlannerState } from './model';
const demoState: PlannerState = {
  version: 1,
  trips: [
    {
      id: 'lisbon',
      title: 'Weekend',
      destination: 'Lisbon',
      start: '2027-05-15',
      end: '2027-05-17',
      ownerUid: 'owner',
      code: 'a'.repeat(32),
      members: ['owner', 'u1', 'u2', 'u3'],
      activities: ['a1', 'a2', 'a3'].map((id) => ({
        id,
        title: 'Walk',
        location: 'River',
        category: 'Outdoors',
        cost: 0,
        notes: '',
        day: null,
        votes: id === 'a1' ? ['u1', 'u2', 'u3'] : [],
      })),
    },
  ],
};

import { plannerReducer } from './planner';
import { stateSchema, tripDays, tripSchema } from './model';
describe('planning rules', () => {
  it('toggles a member vote without duplicates or mutating the source', () => {
    const action = { type: 'vote' as const, tripId: 'lisbon', activityId: 'a1', member: 'owner' };
    const next = plannerReducer(demoState, action);
    expect(next.trips[0].activities[0].votes).toHaveLength(4);
    expect(demoState.trips[0].activities[0].votes).toHaveLength(3);
    expect(plannerReducer(next, action)).toEqual(demoState);
  });
  it('ignores unknown voters', () => {
    expect(
      plannerReducer(demoState, {
        type: 'vote',
        tripId: 'lisbon',
        activityId: 'a1',
        member: 'Stranger',
      }),
    ).toEqual(demoState);
  });
  it('prevents scheduling outside the trip dates', () => {
    expect(() =>
      plannerReducer(demoState, {
        type: 'schedule',
        tripId: 'lisbon',
        activityId: 'a1',
        day: '2027-05-18',
      }),
    ).toThrow();
  });
  it('schedules and removes activities from the itinerary', () => {
    const state = plannerReducer(demoState, {
      type: 'schedule',
      tripId: 'lisbon',
      activityId: 'a3',
      day: '2027-05-16',
    });
    expect(state.trips[0].activities[2].day).toBe('2027-05-16');
    expect(
      plannerReducer(state, { type: 'schedule', tripId: 'lisbon', activityId: 'a3', day: null })
        .trips[0].activities[2].day,
    ).toBeNull();
  });
  it('rejects impossible dates, reversed ranges, and duplicate members', () => {
    const trip = demoState.trips[0];
    expect(tripSchema.safeParse({ ...trip, start: '2027-02-30' }).success).toBe(false);
    expect(tripSchema.safeParse({ ...trip, end: '2027-05-01' }).success).toBe(false);
    expect(tripSchema.safeParse({ ...trip, members: ['owner', 'owner'] }).success).toBe(false);
  });
  it('rejects forged persisted votes and duplicate trip IDs', () => {
    expect(
      stateSchema.safeParse({ ...demoState, trips: [demoState.trips[0], demoState.trips[0]] })
        .success,
    ).toBe(false);
    const state = structuredClone(demoState);
    state.trips[0].activities[0].votes.push('Stranger');
    expect(stateSchema.safeParse(state).success).toBe(false);
  });
  it('enumerates days across a month boundary in UTC', () => {
    expect(tripDays({ ...demoState.trips[0], start: '2027-01-31', end: '2027-02-02' })).toEqual([
      '2027-01-31',
      '2027-02-01',
      '2027-02-02',
    ]);
  });
});
