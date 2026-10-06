# MVP and architecture

## Product scope

The MVP supports one complete journey: create a trip → collect suggestions → compare group preferences → schedule the favourites. Local browser persistence makes the demo usable immediately and keeps backend setup out of the first learning milestone. Demo voting uses named companions and must never be treated as authentication.

The initial release excludes bookings, maps, chat, invitations, accounts, realtime updates, and currency conversion. Activity costs are estimates per person in EUR. Trips are limited to 31 inclusive days to keep the itinerary usable.

## Layers and data flow

React components submit typed actions → `plannerReducer` applies immutable changes → Zod validates the next state → `usePlanner` updates React and asks the repository to persist it.

The domain layer has no React or browser dependencies. `PlannerAction` is a discriminated union; `Trip` and `Activity` are inferred from the runtime schemas to avoid drifting between validation and static types. UI-only state (selected trip, category, search, identity, active tab) stays outside persisted data.

`PlannerRepository` isolates loading and saving. The browser implementation uses a versioned snapshot and validates it on load. Invalid stored data falls back to cloned samples and shows a warning without immediately replacing the original bytes. A subsequent explicit mutation saves the new snapshot. Failed saves retain session state and show an export warning. Stored data is local to the origin and browser; clearing site data removes it. Multiple open tabs are not synchronized and may overwrite one another; use one tab for this MVP.

Dates are ISO calendar strings. Validation rejects nonexistent dates, reversed ranges, oversized trips, duplicate IDs, duplicate companions/votes, nonmember votes, and dates outside the trip. Day enumeration and presentation use UTC to avoid timezone/DST drift. The sum displayed in the header includes scheduled activities only.

Changing trip dates while an activity is scheduled outside the proposed range is rejected. Unplan that activity first. Removing a companion also removes their votes. Deleting an idea immediately removes its votes and schedule; deleting an entire trip requires confirmation.

## Realtime milestone (planned, not implemented)

Firebase changes the persistence model substantially; swapping the synchronous repository alone is insufficient.

Suggested Firestore layout:

```text
trips/{tripId}                        title, destination, dates, ownerUid
trips/{tripId}/members/{uid}          displayName, role
trips/{tripId}/activities/{activityId} title, place, category, cost, notes, day
trips/{tripId}/activities/{id}/votes/{uid} createdAt
```

1. Introduce Firebase Auth. Use UIDs for membership and voting; display names are presentation only.
2. Replace full-snapshot saves with asynchronous command methods and `subscribe(tripId, listener)`. Add pending/loading/error states and unsubscribe on trip change or unmount.
3. Require trip membership in security rules for reads and writes. Restrict membership management to the owner. Only the authenticated voter can create/delete their vote document. Validate writable fields, dates, numeric bounds, and allowed categories.
4. Use UID-keyed vote documents for uniqueness. Use transactions where a command depends on shared state; avoid writing an entire trip to toggle a vote.
5. Add a membership invitation flow, then test rules and two-client changes using emulators. Test nonmembers, forged identities, owner permissions, concurrent updates, and reconnects.

Do not store credentials in source control. Client Firebase configuration does not replace security rules. The current demo identity selector must be removed from a deployed authenticated version.

## Validation strategy

Pure domain tests check planning invariants and immutability; repository tests check recovery and denied access; React interaction tests cover actual user workflows. Strict TypeScript and Vite production build run in CI. Browser checks inspect desktop/mobile layouts and representative interactions.

## Interview discussion

Explain why UI state differs from domain state, why TypeScript cannot validate localStorage, how immutable transitions improve testing, how date-only handling avoids DST errors, and why real collaboration requires authorization and granular concurrent writes.
