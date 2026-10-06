import { useState } from 'react';
export function AuthForm({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (email: string, password: string, register: boolean) => Promise<void>;
  pending: boolean;
  error: string | null;
}) {
  const [register, setRegister] = useState(false);
  return (
    <section className="auth-panel">
      <h1>TripSync</h1>
      <p>Plan a trip together.</p>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSubmit(String(form.get('email')), String(form.get('password')), register);
        }}
      >
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={6}
            autoComplete={register ? 'new-password' : 'current-password'}
            required
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="primary" disabled={pending}>
          {pending ? 'Please wait…' : register ? 'Register' : 'Sign in'}
        </button>
        <button
          className="text-button"
          type="button"
          disabled={pending}
          onClick={() => setRegister(!register)}
        >
          {register ? 'Already have an account? Sign in' : 'Create an account'}
        </button>
      </form>
    </section>
  );
}
