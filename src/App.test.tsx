import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STORAGE_KEY } from './data/storage';
describe('TripSync journeys', () => {
  beforeEach(() => localStorage.clear());
  it('votes once, switches demo member, and keeps the snapshot on reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    const vote = screen.getByRole('button', { name: 'Vote for Get lost in Alfama' });
    await user.click(vote);
    expect(vote).toHaveAttribute('aria-pressed', 'true');
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).trips[0].activities[0].votes,
    ).toHaveLength(4);
    await user.selectOptions(screen.getByLabelText('Demo voting identity'), 'Emma');
    await user.click(screen.getByRole('button', { name: 'Remove vote from Get lost in Alfama' }));
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).trips[0].activities[0].votes,
    ).not.toContain('Emma');
    unmount();
    render(<App />);
    expect(
      screen.getByRole('button', { name: 'Remove vote from Get lost in Alfama' }),
    ).toBeInTheDocument();
  });
  it('adds an idea, filters it, and schedules it on the itinerary', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add an idea' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText("What's the idea?"), 'River walk');
    await user.type(within(dialog).getByLabelText('Place'), 'Tagus river');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Outdoors');
    await user.click(within(dialog).getByRole('button', { name: 'Add idea' }));
    await user.click(screen.getByRole('button', { name: 'Outdoors' }));
    expect(screen.queryByText('Pastéis & a little coffee')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Schedule River walk'), '2027-05-16');
    await user.click(screen.getByRole('tab', { name: 'Itinerary' }));
    expect(screen.getByRole('heading', { name: 'River walk' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unplan River walk' }));
    expect(screen.queryByRole('heading', { name: 'River walk' })).not.toBeInTheDocument();
  });
  it('creates a trip, validates dates, and deletes it after confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create trip' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Trip name'), 'Prague weekend');
    await user.type(within(dialog).getByLabelText('Destination'), 'Prague, Czechia');
    await user.type(within(dialog).getByLabelText('From'), '2027-07-02');
    await user.type(within(dialog).getByLabelText('Until'), '2027-07-01');
    await user.click(within(dialog).getByRole('button', { name: 'Create trip' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Trips must last');
    await user.clear(within(dialog).getByLabelText('Until'));
    await user.type(within(dialog).getByLabelText('Until'), '2027-07-04');
    await user.click(within(dialog).getByRole('button', { name: 'Create trip' }));
    expect(screen.getByRole('heading', { name: 'Prague weekend' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete trip' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete trip' }),
    );
    expect(screen.queryByRole('heading', { name: 'Prague weekend' })).not.toBeInTheDocument();
  });
});
