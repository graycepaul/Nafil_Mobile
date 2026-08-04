import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // System by default: a fresh install should match the device's own
      // light/dark setting rather than forcing light on everyone. Reachable
      // any time from the settings gear in the header.
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'nafil-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
