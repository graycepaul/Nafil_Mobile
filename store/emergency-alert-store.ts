import { create } from 'zustand';

export interface ActiveEmergencyAlert {
  title: string;
  body: string;
  photoUrl?: string;
}

interface EmergencyAlertState {
  alert: ActiveEmergencyAlert | null;
  show: (alert: ActiveEmergencyAlert) => void;
  dismiss: () => void;
}

/**
 * Holds whichever emergency alert should be interrupting the app right now,
 * regardless of what screen the resident happens to be on - a global store
 * rather than screen-local state precisely because "which screen is this"
 * shouldn't matter for an emergency. Set from the foreground notification
 * listener in app/_layout.tsx; read by EmergencyAlertModal, rendered once at
 * the app root.
 */
export const useEmergencyAlertStore = create<EmergencyAlertState>((set) => ({
  alert: null,
  show: (alert) => set({ alert }),
  dismiss: () => set({ alert: null }),
}));
