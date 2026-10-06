import { beforeEach, describe, expect, it } from 'vitest';
import { browserRepository, STORAGE_KEY } from './storage';
import { demoState } from './seed';
describe('browser persistence', () => {
  beforeEach(() => localStorage.clear());
  it('round trips a validated snapshot', () => {
    const repo = browserRepository(localStorage);
    repo.save(demoState);
    expect(repo.load()).toEqual({ state: demoState, warning: null });
  });
  it('recovers from corrupted data without silently overwriting it', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    const result = browserRepository(localStorage).load();
    expect(result.state).toEqual(demoState);
    expect(result.warning).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
  it('still loads a demo when browser storage access is denied', () => {
    const repo = browserRepository(() => {
      throw new Error('denied');
    });
    expect(repo.load().warning).toBeTruthy();
    expect(() => repo.save(demoState)).toThrow('denied');
  });
});
