import { stateSchema, type PlannerState } from '../domain/model';
import { demoState } from './seed';
export const STORAGE_KEY = 'tripsync.planner.v1';
export interface PlannerRepository {
  load(): { state: PlannerState; warning: string | null };
  save(state: PlannerState): void;
}
export function browserRepository(storage: Storage | (() => Storage)): PlannerRepository {
  const getStorage = () => (typeof storage === 'function' ? storage() : storage);
  return {
    load() {
      try {
        const raw = getStorage().getItem(STORAGE_KEY);
        if (!raw) return { state: structuredClone(demoState), warning: null };
        return { state: stateSchema.parse(JSON.parse(raw)), warning: null };
      } catch {
        return {
          state: structuredClone(demoState),
          warning:
            'Saved data could not be read. Showing sample trips; the original data has not been overwritten.',
        };
      }
    },
    save(state) {
      getStorage().setItem(STORAGE_KEY, JSON.stringify(stateSchema.parse(state)));
    },
  };
}
