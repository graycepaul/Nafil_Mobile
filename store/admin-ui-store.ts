import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AdminUiState {
  /**
   * When this device last opened the Marketplace screen — used to badge the
   * Dashboard's Market icon only for listings posted since, the same way a
   * "new" indicator works anywhere else. Unlike the Wallet icon's badge
   * (which stays lit for as long as a transfer/due is genuinely
   * unresolved), there's no pending/resolved state for a listing — the only
   * thing to track is whether this device has looked yet.
   *
   * Deliberately not per-user: if two staff share a device, they'd share
   * this timestamp too. Acceptable for a freshness indicator; not worth a
   * user-keyed store for.
   */
  lastViewedMarketAt: string | null;
  markMarketViewed: () => void;
}

export const useAdminUiStore = create<AdminUiState>()(
  persist(
    (set) => ({
      lastViewedMarketAt: null,
      markMarketViewed: () => set({ lastViewedMarketAt: new Date().toISOString() }),
    }),
    {
      name: 'nafil-admin-ui',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
