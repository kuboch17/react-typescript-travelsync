import { useState } from 'react';
import { browserRepository } from '../data/storage';
import { plannerReducer, type PlannerAction } from '../domain/planner';
export function usePlanner() {
  const [repository] = useState(() => browserRepository(() => window.localStorage));
  const [loaded] = useState(() => repository.load());
  const [state, setState] = useState(loaded.state);
  const [warning, setWarning] = useState(loaded.warning);
  function dispatch(action: PlannerAction) {
    const next = plannerReducer(state, action);
    setState(next);
    try {
      repository.save(next);
      setWarning(null);
    } catch {
      setWarning(
        'Your changes are in this session only. Browser storage is unavailable or full. Export a backup before closing.',
      );
    }
  }
  return { state, dispatch, warning };
}
