import { readFileSync } from 'node:fs';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
  query,
  where,
} from 'firebase/firestore';
let env;
const code = 'a'.repeat(32);
const trip = {
  title: 'Weekend',
  destination: 'Lisbon',
  start: '2027-05-15',
  end: '2027-05-17',
  ownerUid: 'owner',
  code,
  members: ['owner', 'member'],
};
const activity = {
  title: 'Walk',
  location: 'River',
  category: 'Outdoors',
  cost: 0,
  notes: '',
  day: null,
};
const db = (uid) =>
  uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
const tripRef = (client) => doc(client, 'trips/t1');
const activityRef = (client) => doc(client, 'trips/t1/activities/a1');
const voteRef = (client, uid) => doc(client, `trips/t1/activities/a1/votes/${uid}`);
async function join(client, uid, value = code) {
  const batch = writeBatch(client);
  batch.set(doc(client, `trips/t1/joins/${uid}`), { code: value });
  batch.update(tripRef(client), { members: arrayUnion(uid) });
  return batch.commit();
}
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tripsync',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const client = context.firestore();
    await setDoc(doc(client, 'tripIds/t1'), { ownerUid: 'owner' });
    await setDoc(doc(client, 'trips/t1/activityIds/a1'), { uid: 'owner' });
    await setDoc(tripRef(client), trip);
    await setDoc(doc(client, `tripCodes/${code}`), { tripId: 't1' });
    await setDoc(activityRef(client), activity);
    await setDoc(voteRef(client, 'member'), { uid: 'member' });
  });
});
test('only members can read trips, activities and votes; queries must filter membership', async () => {
  for (const uid of [null, 'stranger']) {
    const client = db(uid);
    await assertFails(getDoc(tripRef(client)));
    await assertFails(getDoc(activityRef(client)));
    await assertFails(getDocs(collection(client, 'trips/t1/activities/a1/votes')));
    await assertFails(setDoc(activityRef(client), activity));
  }
  const client = db('member');
  await assertSucceeds(getDoc(tripRef(client)));
  await assertSucceeds(getDocs(collection(client, 'trips/t1/activities')));
  await assertSucceeds(getDocs(collection(client, 'trips/t1/activities/a1/votes')));
  await assertFails(getDocs(collection(client, 'trips')));
  const result = await assertSucceeds(
    getDocs(query(collection(client, 'trips'), where('members', 'array-contains', 'member'))),
  );
  assert.equal(result.size, 1);
});
test('exact code lookup and atomic joining work without a public trip read', async () => {
  const client = db('stranger');
  await assertFails(getDoc(doc(db(null), `tripCodes/${code}`)));
  await assertFails(getDocs(collection(client, 'tripCodes')));
  await assertFails(getDoc(tripRef(client)));
  await assertSucceeds(getDoc(doc(client, `tripCodes/${code}`)));
  await assertSucceeds(join(client, 'stranger'));
  await assertSucceeds(getDoc(tripRef(client)));
  await assertSucceeds(join(client, 'stranger')); // idempotent rejoin
});
test('wrong codes, forged membership, standalone proof and someone else joining are denied', async () => {
  const client = db('stranger');
  await assertFails(join(client, 'stranger', 'b'.repeat(32)));
  await assertFails(updateDoc(tripRef(client), { members: arrayUnion('stranger') }));
  await assertFails(setDoc(doc(client, 'trips/t1/joins/stranger'), { code }));
  await assertFails(join(client, 'victim'));
  await assertFails(updateDoc(tripRef(db('owner')), { members: arrayUnion('victim') }));
  await assertFails(updateDoc(tripRef(db('member')), { members: ['member'] }));
});
test('one UID-keyed vote; users cannot write or delete other votes', async () => {
  const client = db('owner');
  await assertSucceeds(setDoc(voteRef(client, 'owner'), { uid: 'owner' }));
  await assertFails(setDoc(voteRef(client, 'owner'), { uid: 'owner' }));
  await assertFails(setDoc(voteRef(client, 'other'), { uid: 'owner' }));
  await assertFails(deleteDoc(voteRef(client, 'member')));
  await assertFails(updateDoc(voteRef(db('member'), 'member'), { uid: 'owner' }));
  await assertSucceeds(deleteDoc(voteRef(client, 'owner')));
  await assertSucceeds(setDoc(voteRef(client, 'owner'), { uid: 'owner' }));
  await assertFails(setDoc(voteRef(db('stranger'), 'stranger'), { uid: 'stranger' }));
});
test('members collaborate but cannot change owner, code or embed forged votes', async () => {
  const client = db('member');
  await assertSucceeds(updateDoc(tripRef(client), { title: 'New title' }));
  await assertFails(updateDoc(tripRef(client), { ownerUid: 'member' }));
  await assertFails(updateDoc(tripRef(client), { code: 'b'.repeat(32) }));
  await assertSucceeds(updateDoc(activityRef(client), { day: '2027-05-16' }));
  await assertFails(updateDoc(activityRef(client), { day: '2027-05-20' }));
  await assertFails(updateDoc(activityRef(client), { cost: -1 }));
  await assertFails(updateDoc(activityRef(client), { votes: ['owner'] }));
});
test('only owner deletes trip atomically with code; orphan data remains inaccessible', async () => {
  for (const uid of [null, 'stranger', 'member']) {
    const client = db(uid);
    const batch = writeBatch(client);
    batch.delete(tripRef(client));
    batch.delete(doc(client, `tripCodes/${code}`));
    await assertFails(batch.commit());
  }
  const client = db('owner');
  await assertFails(deleteDoc(tripRef(client)));
  await assertFails(deleteDoc(doc(client, `tripCodes/${code}`)));
  const batch = writeBatch(client);
  batch.delete(tripRef(client));
  batch.delete(doc(client, `tripCodes/${code}`));
  await assertSucceeds(batch.commit());
  await assertFails(getDoc(activityRef(client)));
  await assertFails(getDoc(voteRef(client, 'member')));
  await assertFails(join(db('stranger'), 'stranger'));
  const recreate = writeBatch(client);
  recreate.set(tripRef(client), { ...trip, members: ['owner'] });
  recreate.set(doc(client, `tripCodes/${code}`), { tripId: 't1' });
  await assertFails(recreate.commit());
});
test('creation requires an atomic matching code and authenticated owner', async () => {
  const client = db('owner');
  const value = 'b'.repeat(32);
  const data = { ...trip, code: value, members: ['owner'] };
  await assertFails(setDoc(doc(client, 'trips/t2'), data));
  await assertFails(setDoc(doc(client, `tripCodes/${value}`), { tripId: 't2' }));
  const batch = writeBatch(client);
  batch.set(doc(client, 'tripIds/t2'), { ownerUid: 'owner' });
  batch.set(doc(client, 'trips/t2'), data);
  batch.set(doc(client, `tripCodes/${value}`), { tripId: 't2' });
  await assertSucceeds(batch.commit());
  const forgedClient = db('member');
  const forged = writeBatch(forgedClient);
  forged.set(doc(forgedClient, 'trips/t3'), { ...data, code: 'c'.repeat(32) });
  forged.set(doc(forgedClient, `tripCodes/${'c'.repeat(32)}`), { tripId: 't3' });
  await assertFails(forged.commit());
});
test('eight-member limit and votes on missing activities are enforced', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(tripRef(context.firestore()), {
      members: ['owner', 'member', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
    });
  });
  await assertFails(join(db('stranger'), 'stranger'));
  await assertSucceeds(deleteDoc(activityRef(db('owner'))));
  await assertFails(getDoc(voteRef(db('member'), 'member')));
  await assertFails(setDoc(voteRef(db('owner'), 'owner'), { uid: 'owner' }));
  const client = db('owner');
  const recreate = writeBatch(client);
  recreate.set(activityRef(client), activity);
  recreate.set(doc(client, 'trips/t1/activityIds/a1'), { uid: 'owner' });
  await assertFails(recreate.commit());
});

test('repository synchronizes two clients, concurrent UID votes, scheduling and deletion', async () => {
  const { createRequire } = await import('node:module');
  const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
  await build({
    entryPoints: ['src/data/firestore.ts'],
    outfile: 'tests/.tmp/repository.mjs',
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
  });
  const { firebaseRepository } = await import('./.tmp/repository.mjs');
  const owner = firebaseRepository(db('owner'), 'owner');
  const joiner = firebaseRepository(db('joiner'), 'joiner');
  const code2 = 'd'.repeat(32);
  let ownerState, joinerState, failure;
  const stopOwner = owner.subscribe(
    (state) => {
      ownerState = state;
    },
    (error) => {
      failure = error;
    },
  );
  const stopJoiner = joiner.subscribe(
    (state) => {
      joinerState = state;
    },
    (error) => {
      failure = error;
    },
  );
  const until = async (predicate) => {
    const deadline = Date.now() + 10000;
    while (!predicate()) {
      if (failure) throw failure;
      if (Date.now() > deadline) throw new Error('Realtime subscription timed out');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  try {
    await owner.dispatch({
      type: 'create-trip',
      trip: { ...trip, id: 'realtime', code: code2, members: ['owner'], activities: [] },
    });
    await until(() => ownerState?.trips.some((t) => t.id === 'realtime'));
    assert.equal(await joiner.join(code2), 'realtime');
    await until(() => joinerState?.trips.some((t) => t.id === 'realtime'));
    await owner.dispatch({
      type: 'add-activity',
      tripId: 'realtime',
      activity: { ...activity, id: 'walk', votes: [] },
    });
    const current = () => joinerState?.trips.find((t) => t.id === 'realtime')?.activities[0];
    await until(() => current()?.id === 'walk');
    const beforeVotes = current();
    await Promise.all([
      owner.dispatch({ type: 'vote', tripId: 'realtime', activityId: 'walk', member: 'forged' }),
      joiner.dispatch({ type: 'vote', tripId: 'realtime', activityId: 'walk', member: 'forged' }),
    ]);
    await until(() => current()?.votes.length === 2);
    assert.deepEqual([...current().votes].sort(), ['joiner', 'owner']);
    assert.equal(beforeVotes.votes.length, 0); // published snapshots must stay immutable for React memoization
    await owner.dispatch({ type: 'vote', tripId: 'realtime', activityId: 'walk', member: 'owner' });
    await until(() => current()?.votes.length === 1);
    await joiner.dispatch({
      type: 'schedule',
      tripId: 'realtime',
      activityId: 'walk',
      day: '2027-05-16',
    });
    await until(
      () => ownerState?.trips.find((t) => t.id === 'realtime')?.activities[0]?.day === '2027-05-16',
    );
    await owner.dispatch({ type: 'delete-trip', tripId: 'realtime' });
    await until(() => !joinerState?.trips.some((t) => t.id === 'realtime'));
  } finally {
    stopOwner();
    stopJoiner();
  }
});
