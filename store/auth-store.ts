import { create } from 'zustand';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  init: () => () => void;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return (data as Profile | null) ?? null;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  /** Subscribe to Supabase auth changes. Returns an unsubscribe function. */
  init: () => {
    if (get().initialized) return () => {};
    set({ initialized: true });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      set({ session, profile, loading: false });
    });

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      set({ session, profile, loading: false });
    });

    // Confirming an email (or resetting a password) commonly happens in a
    // *different* tab/browser than the one waiting on "check your email" —
    // that waiting tab has no way to find out a session now exists until
    // something makes it look again, hence needing a manual reload. Native
    // has the same problem across app backgrounding: iOS/Android can freeze
    // JS timers while backgrounded, so the SDK's own refresh timer may not
    // have fired by the time the user returns. Supabase's own docs recommend
    // exactly this pattern for React Native — tie autoRefresh to AppState —
    // and re-checking the session on the same trigger closes the web gap too.
    let removeAppStateListener: (() => void) | undefined;
    if (Platform.OS === 'web') {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') get().refreshSession();
      };
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', handleVisibility);
      removeAppStateListener = () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', handleVisibility);
      };
    } else {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          supabase.auth.startAutoRefresh();
          get().refreshSession();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      });
      removeAppStateListener = () => subscription.remove();
    }

    return () => {
      data.subscription.unsubscribe();
      removeAppStateListener?.();
    };
  },

  refreshSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const current = get().session;
    // Skip the profile refetch when nothing actually changed — this fires on
    // every tab-focus/app-foreground, not just the one time it matters.
    if (session?.access_token === current?.access_token) return;
    const profile = session?.user ? await fetchProfile(session.user.id) : null;
    set({ session, profile, loading: false });
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;
    set({ profile: await fetchProfile(userId) });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
