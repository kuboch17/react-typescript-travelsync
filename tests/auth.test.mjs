import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
test('email/password registration, logout and login retain the same Firebase UID', async () => {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-tripsync' }, 'auth-test');
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const email = `test-${Date.now()}@example.com`;
  const password = 'emulator-test-password';
  const states = [];
  const unsubscribe = onAuthStateChanged(auth, (user) => states.push(user?.uid ?? null));
  try {
    const registered = await createUserWithEmailAndPassword(auth, email, password);
    const uid = registered.user.uid;
    assert.ok(uid);
    await assert.rejects(createUserWithEmailAndPassword(auth, email, password), {
      code: 'auth/email-already-in-use',
    });
    await signOut(auth);
    assert.equal(auth.currentUser, null);
    await assert.rejects(signInWithEmailAndPassword(auth, email, 'wrong-password'));
    assert.equal(auth.currentUser, null);
    const loggedIn = await signInWithEmailAndPassword(auth, email, password);
    assert.equal(loggedIn.user.uid, uid);
    await signOut(auth);
    assert.ok(states.includes(uid));
    assert.ok(states.includes(null));
  } finally {
    unsubscribe();
    await deleteApp(app);
  }
});
