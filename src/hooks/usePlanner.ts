import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../data/firebase';
import { firebaseRepository } from '../data/firestore';
import type { PlannerAction } from '../domain/planner';
import type { PlannerState } from '../domain/model';
const empty: PlannerState = { version: 1, trips: [] };
export function usePlanner(uid: string | null) {
  const repository = useMemo(() => (db && uid ? firebaseRepository(db, uid) : null), [uid]);
  const currentUid = useRef(uid);
  currentUid.current = uid;
  const [snapshot, setSnapshot] = useState<{ uid: string | null; state: PlannerState }>({
    uid: null,
    state: empty,
  });
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    setWarning(null);
    setPendingCount(0);
    setLoading(Boolean(repository));
    if (!repository) return;
    return repository.subscribe(
      (state) => {
        setSnapshot({ uid, state });
        setWarning(null);
        setLoading(false);
      },
      () => {
        setSnapshot({ uid, state: empty });
        setWarning(
          'Could not sync trips. Check your connection and Firebase configuration, then reload.',
        );
        setLoading(false);
      },
    );
  }, [repository, uid]);
  async function command<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (!repository) return;
    setPendingCount((count) => count + 1);
    setWarning(null);
    try {
      return await operation();
    } catch (reason) {
      if (currentUid.current === uid)
        setWarning(
          reason instanceof Error && reason.message.startsWith('Trip code')
            ? reason.message
            : 'Could not save changes. Check the code, connection and permissions, then try again.',
        );
    } finally {
      if (currentUid.current === uid) setPendingCount((count) => Math.max(0, count - 1));
    }
  }
  return {
    state: snapshot.uid === uid ? snapshot.state : empty,
    warning,
    loading,
    pending: pendingCount > 0,
    dispatch: (action: PlannerAction) =>
      command(async () => {
        await repository!.dispatch(action);
        return true;
      }),
    join: (code: string) => command(() => repository!.join(code)),
  };
}
