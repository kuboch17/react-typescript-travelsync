import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
const mocks = vi.hoisted(() => ({
  configured: true,
  user: { uid: 'owner', email: 'owner@example.com' } as { uid: string; email: string } | null,
  dispatch: vi.fn(),
  join: vi.fn(),
  logout: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock('./data/firebase', () => ({
  get configured() {
    return mocks.configured;
  },
}));
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    pending: false,
    error: null,
    logout: mocks.logout,
    authenticate: mocks.authenticate,
  }),
}));
vi.mock('./hooks/usePlanner', () => ({
  usePlanner: () => ({
    state: {
      version: 1,
      trips: [
        {
          id: 't1',
          title: 'Weekend',
          destination: 'Lisbon',
          start: '2027-05-15',
          end: '2027-05-17',
          ownerUid: 'owner',
          code: 'a'.repeat(32),
          members: ['owner', 'member'],
          activities: [
            {
              id: 'a1',
              title: 'Walk',
              location: 'River',
              category: 'Outdoors',
              cost: 0,
              notes: '',
              day: null,
              votes: [],
            },
          ],
        },
      ],
    },
    dispatch: mocks.dispatch,
    join: mocks.join,
    warning: null,
    pending: false,
    loading: false,
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured = true;
  mocks.user = { uid: 'owner', email: 'owner@example.com' };
  mocks.dispatch.mockResolvedValue(true);
});
describe('authenticated TripSync UI', () => {
  it('shows actionable setup when configuration is missing', () => {
    mocks.configured = false;
    render(<App />);
    expect(screen.getByText(/Copy .env.example/)).toBeInTheDocument();
  });
  it('submits login and registration with email/password', async () => {
    mocks.user = null;
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(mocks.authenticate).toHaveBeenLastCalledWith('test@example.com', 'password123', false);
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.click(screen.getByRole('button', { name: 'Register' }));
    expect(mocks.authenticate).toHaveBeenLastCalledWith('test@example.com', 'password123', true);
  });
  it('votes with the session UID, joins with code and signs out', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByLabelText('Demo voting identity')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vote for Walk' }));
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'vote',
      tripId: 't1',
      activityId: 'a1',
      member: 'owner',
    });
    await user.type(screen.getByLabelText('Trip code'), 'b'.repeat(32));
    await user.click(screen.getByRole('button', { name: 'Join trip' }));
    expect(mocks.join).toHaveBeenCalledWith('b'.repeat(32));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
  it('hides trip deletion from non-owners', () => {
    mocks.user = { uid: 'member', email: 'member@example.com' };
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Delete trip' })).not.toBeInTheDocument();
  });
  it('keeps a trip form open when saving fails', async () => {
    mocks.dispatch.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Edit trip' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save trip' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
