import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../data/firebase';
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(
    () =>
      auth
        ? onAuthStateChanged(
            auth,
            (next) => {
              setUser(next);
              setLoading(false);
            },
            () => {
              setError('Could not restore your session. Reload and try again.');
              setLoading(false);
            },
          )
        : undefined,
    [],
  );
  async function authenticate(email: string, password: string, register: boolean) {
    if (!auth) return;
    setPending(true);
    setError(null);
    try {
      await (register ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(
        auth,
        email,
        password,
      );
    } catch {
      setError(
        register
          ? 'Registration failed. Check your email and use at least 6 password characters; the email may already be registered.'
          : 'Sign in failed. Check your email and password and try again.',
      );
    } finally {
      setPending(false);
    }
  }
  async function logout() {
    if (!auth) return;
    setPending(true);
    setError(null);
    try {
      await signOut(auth);
    } catch {
      setError('Sign out failed. Try again.');
    } finally {
      setPending(false);
    }
  }
  return { user, loading, error, pending, authenticate, logout };
}
