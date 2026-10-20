import { create } from 'zustand';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/query-client';
import { unregisterThisDevice } from '../lib/push-notifications';
import { loadProfileWithRetry, type ProfileLoad } from '../lib/profile-loader';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  /** A session exists but the profile could not be loaded even after retrying; the root layout offers Retry / Sign out. */
  profileError: boolean;
  init: () => () => void;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchProfileOnce(userId: string): Promise<ProfileLoad> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return { profile: null, failed: true };
  return { profile: data as Profile, failed: false };
}

export const useAuthStore = create<AuthState>()((set, get) => {
  // Two session changes can overlap (launch, then a token refresh); only the
  // latest one is allowed to write its result.
  let applySeq = 0;

  async function applySession(session: Session | null) {
    const seq = ++applySeq;
    if (!session?.user) {
      set({ session: null, profile: null, profileError: false, loading: false });
      return;
    }
    const result = await loadProfileWithRetry(() => fetchProfileOnce(session.user.id));
    if (seq !== applySeq) return;
    set({
      session,
      profile: result.profile,
      profileError: result.failed && !result.profile,
      loading: false,
    });
  }

  return {
    session: null,
    profile: null,
    loading: true,
    initialized: false,
    profileError: false,

    /** Subscribe to Supabase auth changes. Returns an unsubscribe function. */
    init: () => {
      if (get().initialized) return () => {};
      set({ initialized: true });

      supabase.auth.getSession().then(({ data: { session } }) => applySession(session));

      // A synchronous callback that only schedules work. Awaiting another Supabase
      // call inside it can deadlock when the event is a token refresh (the library
      // documents this: the nested call waits on the refresh that is waiting on
      // the callback), so the profile load runs after the callback returns.
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          void applySession(null);
          return;
        }
        setTimeout(() => void applySession(session), 0);
      });

      // Confirming an email (or resetting a password) commonly happens in a
      // *different* tab/browser than the one waiting on "check your email" -
      // that waiting tab has no way to find out a session now exists until
      // something makes it look again, hence needing a manual reload. Native
      // has the same problem across app backgrounding: iOS/Android can freeze
      // JS timers while backgrounded, so the SDK's own refresh timer may not
      // have fired by the time the user returns. Supabase's own docs recommend
      // exactly this pattern for React Native - tie autoRefresh to AppState -
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
      // Skip the profile refetch when nothing actually changed - this fires on
      // every tab-focus/app-foreground, not just the one time it matters. A
      // failed profile load is the exception: foregrounding is a natural moment
      // to try again.
      if (session?.access_token === current?.access_token && !get().profileError) return;
      await applySession(session);
    },

    refreshProfile: async () => {
      const session = get().session;
      if (!session?.user) return;
      const result = await loadProfileWithRetry(() => fetchProfileOnce(session.user.id));
      if (result.profile) set({ profile: result.profile, profileError: false });
      else if (!get().profile) set({ profileError: true });
    },

    signOut: async () => {
      // While the session still exists: stop this phone receiving the account's
      // notifications, and drop everything cached for it so the next person to
      // sign in on this device never sees it.
      await unregisterThisDevice();
      queryClient.clear();
      await supabase.auth.signOut();
      set({ session: null, profile: null, profileError: false });
    },
  };
});
