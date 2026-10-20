import { create } from 'zustand';
import type { DevScope } from '../types/devcontrol';

interface DevControlState {
  scope: DevScope;
  setScope: (scope: DevScope) => void;
}

/** Which dataset (live or test) every devControl tab is showing. Shared so switching on one tab applies to all three. */
export const useDevControlStore = create<DevControlState>((set) => ({
  scope: 'live',
  setScope: (scope) => set({ scope }),
}));
