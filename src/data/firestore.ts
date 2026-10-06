import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import {
  activitySchema,
  tripSchema,
  type Activity,
  type PlannerState,
  type Trip,
} from '../domain/model';
import type { PlannerAction } from '../domain/planner';

export function firebaseRepository(db: Firestore, uid: string) {
  return {
    subscribe(next: (state: PlannerState) => void, error: (error: Error) => void) {
      const trips = new Map<string, Trip>();
      const children = new Map<string, () => void>();
      let active = true;
      const emit = () => {
        if (active)
          next({
            version: 1,
            trips: [...trips.values()].map((trip) => ({
              ...trip,
              members: [...trip.members],
              activities: trip.activities.map((activity) => ({
                ...activity,
                votes: [...activity.votes],
              })),
            })),
          });
      };
      const fail = (reason: Error) => {
        if (active) error(reason);
      };
      const stop = onSnapshot(
        query(collection(db, 'trips'), where('members', 'array-contains', uid)),
        { includeMetadataChanges: true },
        (snapshot) => {
          const ids = new Set(snapshot.docs.map((d) => d.id));
          for (const [id, unsubscribe] of children) {
            if (!ids.has(id)) {
              unsubscribe();
              children.delete(id);
              trips.delete(id);
            }
          }
          for (const row of snapshot.docs) {
            try {
              const previous = trips.get(row.id);
              trips.set(row.id, tripSchema.parse({ ...row.data(), id: row.id, activities: [] }));
              trips.get(row.id)!.activities = previous?.activities ?? [];
              if (children.has(row.id) || row.metadata.hasPendingWrites) continue;
              // Child streams can lose permission before the parent stream reports deletion.
              const childError = async (reason: Error, activityId?: string) => {
                if ((reason as { code?: string }).code === 'permission-denied') {
                  try {
                    const parent = await getDoc(doc(db, 'trips', row.id));
                    if (!parent.exists()) return;
                    if (
                      activityId &&
                      !(await getDoc(doc(db, 'trips', row.id, 'activities', activityId))).exists()
                    )
                      return;
                  } catch (checkError) {
                    if ((checkError as { code?: string }).code === 'permission-denied') return;
                  }
                }
                fail(reason);
              };
              const voteStops = new Map<string, () => void>();
              const activities = new Map<string, Activity>();
              const publishActivities = () => {
                const trip = trips.get(row.id);
                if (trip) {
                  trip.activities = [...activities.values()];
                  emit();
                }
              };
              const stopActivities = onSnapshot(
                collection(db, 'trips', row.id, 'activities'),
                { includeMetadataChanges: true },
                (activitySnapshot) => {
                  const activityIds = new Set(activitySnapshot.docs.map((d) => d.id));
                  for (const [id, unsubscribe] of voteStops) {
                    if (!activityIds.has(id)) {
                      unsubscribe();
                      voteStops.delete(id);
                      activities.delete(id);
                    }
                  }
                  for (const activity of activitySnapshot.docs) {
                    try {
                      const votes = activities.get(activity.id)?.votes ?? [];
                      activities.set(
                        activity.id,
                        activitySchema.parse({ ...activity.data(), id: activity.id, votes }),
                      );
                      if (!voteStops.has(activity.id) && !activity.metadata.hasPendingWrites) {
                        voteStops.set(
                          activity.id,
                          onSnapshot(
                            collection(db, 'trips', row.id, 'activities', activity.id, 'votes'),
                            (votesSnapshot) => {
                              const current = activities.get(activity.id);
                              if (current) {
                                current.votes = votesSnapshot.docs.map((v) => v.id);
                                publishActivities();
                              }
                            },
                            (reason) => {
                              void childError(reason, activity.id);
                            },
                          ),
                        );
                      }
                    } catch (reason) {
                      fail(reason as Error);
                    }
                  }
                  publishActivities();
                },
                (reason) => {
                  void childError(reason);
                },
              );
              children.set(row.id, () => {
                stopActivities();
                voteStops.forEach((unsubscribe) => unsubscribe());
              });
            } catch (reason) {
              fail(reason as Error);
            }
          }
          emit();
        },
        fail,
      );
      return () => {
        active = false;
        stop();
        children.forEach((unsubscribe) => unsubscribe());
      };
    },
    async join(code: string) {
      if (!/^[a-f0-9]{32}$/.test(code)) throw new Error('Enter a valid trip code.');
      const lookup = await getDoc(doc(db, 'tripCodes', code));
      if (!lookup.exists()) throw new Error('Trip code not found.');
      const tripId = lookup.data().tripId as string;
      // Do not read the private trip before becoming a member.
      const batch = writeBatch(db);
      batch.set(doc(db, 'trips', tripId, 'joins', uid), { code });
      batch.update(doc(db, 'trips', tripId), { members: arrayUnion(uid) });
      await batch.commit();
      return tripId;
    },
    async dispatch(action: PlannerAction) {
      if (action.type === 'create-trip') {
        const trip = tripSchema.parse(action.trip);
        const { id, activities: _activities, ...data } = trip;
        await runTransaction(db, async (transaction) => {
          const codeRef = doc(db, 'tripCodes', trip.code);
          if ((await transaction.get(codeRef)).exists())
            throw new Error('Code collision. Please create the trip again.');
          transaction.set(doc(db, 'tripIds', id), { ownerUid: uid });
          transaction.set(doc(db, 'trips', id), data);
          transaction.set(codeRef, { tripId: id });
        });
        return;
      }
      if (action.type === 'update-trip') {
        const { title, destination, start, end } = tripSchema.parse(action.trip);
        await updateDoc(doc(db, 'trips', action.trip.id), { title, destination, start, end });
        return;
      }
      const tripRef = doc(db, 'trips', action.tripId);
      if (action.type === 'delete-trip') {
        await runTransaction(db, async (transaction) => {
          const trip = await transaction.get(tripRef);
          if (!trip.exists()) return;
          transaction.delete(doc(db, 'tripCodes', trip.data().code));
          transaction.delete(tripRef);
        });
        return;
      }
      if (action.type === 'add-activity') {
        const { id, votes: _votes, ...data } = activitySchema.parse(action.activity);
        const batch = writeBatch(db);
        batch.set(doc(db, 'trips', action.tripId, 'activityIds', id), { uid });
        batch.set(doc(db, 'trips', action.tripId, 'activities', id), data);
        await batch.commit();
        return;
      }
      const activityRef = doc(db, 'trips', action.tripId, 'activities', action.activityId);
      if (action.type === 'delete-activity') await deleteDoc(activityRef);
      else if (action.type === 'schedule') await updateDoc(activityRef, { day: action.day });
      else {
        const voteRef = doc(
          db,
          'trips',
          action.tripId,
          'activities',
          action.activityId,
          'votes',
          uid,
        );
        await runTransaction(db, async (transaction) => {
          const vote = await transaction.get(voteRef);
          if (vote.exists()) transaction.delete(voteRef);
          else transaction.set(voteRef, { uid });
        });
      }
    },
  };
}
