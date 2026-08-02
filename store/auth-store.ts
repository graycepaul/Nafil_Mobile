import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  init: () => () => void;
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

    return () => data.subscription.unsubscribe();
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
