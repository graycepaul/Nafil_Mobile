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
      // Light by default rather than 'system' — the brand is designed light-first,
      // and following the OS would mean the client's first launch looks different
      // depending on their phone settings. Users can still opt into dark/system.
      mode: 'light',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'nafil-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
