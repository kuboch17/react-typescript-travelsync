# TripSync architecture

The UI submits typed commands through `usePlanner` to `firebaseRepository`. Zod validates forms and new documents; Firestore Security Rules independently enforce access and writable fields. The pure domain reducer stays available for domain tests. UI state (selection, filter, search, active tab) is not stored in Firestore.

Firebase Auth supplies the signed-in UID. Signed-out users only see the authentication form. Missing Web app configuration displays setup instructions. Auth session persistence is managed by Firebase; planner data has no localStorage fallback or sample identities.

## Firestore layout

```text
trips/{id}                               title, destination, start, end, ownerUid, code, members: UID[]
tripCodes/{128-bit random hex code}       tripId
trips/{id}/joins/{uid}                    code
trips/{id}/activities/{activityId}        title, location, category, cost, notes, day
trips/{id}/activities/{activityId}/votes/{uid}  uid
```

The member-filtered trip query and activity/vote collections use `onSnapshot`. Listeners are detached on removal, sign out and unmount. Session UID guards keep one user's state out of another user's view. Commands await server acceptance; failed saves leave dialogs open and show an error. Concurrent commands use granular fields; votes toggle in a transaction.

Creating a trip atomically creates its unique code document. A signed-in joiner gets that exact code document (listing is forbidden) and atomically creates a self-owned code proof plus `arrayUnion(uid)` on the trip, without reading private trip data. Rules validate the code and final membership with `getAfter`. Existing members can rejoin idempotently; callers cannot add someone else or edit the owner/code. Owner-only deletion atomically removes the parent and code. Orphaned subcollections are denied by parent-existence checks; physical cleanup is outside the MVP.

Dates are ISO calendar strings, displayed in UTC. Client validation checks real dates, 31-day maximum and schedules within the proposed trip range. Rules check date shape/order and activity dates against current trip bounds. When shortening a trip, unplan any activities outside the new range first. Members may edit ideas and the plan; only their own vote can be created/deleted. UID-keyed vote documents ensure one vote per activity and user.

Unit tests cover domain invariants; UI tests cover auth, UID voting, joining and failed saves. Emulator tests validate actual rules and attack cases. CI runs all tests and production build. Firebase project provisioning and production configuration are manual setup steps.

Permanent `tripIds` and `activityIds` reservations prevent reusing deleted IDs to expose old subcollections or resurrect votes. These markers cannot be read, edited or deleted by clients.
