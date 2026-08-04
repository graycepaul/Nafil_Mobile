import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { acceptStaffInviteByEmail } from '../../lib/staff-invite';
import { useTheme } from '../../context/theme-context';
import { useAuthStore } from '../../store/auth-store';
import type { EstateJoinRequest } from '../../types/database';

/**
 * Not a screen — a router. Decides which onboarding step a resident belongs on
 * and immediately redirects, based on what's actually true in the database
 * rather than which step they came from. That's what makes the wizard resumable:
 * close the app mid-flow and reopening lands you back exactly where you left off,
 * not at square one.
 *
 * The first thing it does, before any resident-wizard logic, is try to finalize
 * a staff invite by email match. This is where a just-confirmed staff signup
 * actually becomes staff: they land here with a brand-new session and a
 * default resident-shaped profile (role='resident', approved=false — the
 * signup trigger's default for everyone), and this call is what turns that
 * into role='security'/estate_id set/approved=true. It's a harmless no-op for
 * every genuine resident, who has no matching invite.
 */
export default function OnboardingRouter() {
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    async function run() {
      const { accepted } = await acceptStaffInviteByEmail();
      if (cancelled) return;

      if (accepted) {
        // Profile is no longer resident-shaped. Refreshing updates the store,
        // which the root layout's own effect reacts to and routes accordingly —
        // nothing further for this component to decide.
        await refreshProfile();
        return;
      }

      // Not a staff invite — proceed as an ordinary resident.
      if (!profile!.phone) {
        router.replace('/profile-setup');
        return;
      }

      const { data } = await supabase
        .from('estate_join_requests')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;

      const latest = data as EstateJoinRequest | null;
      if (!latest || latest.status === 'rejected') {
        router.replace('/join-estate');
      } else {
        // 'pending' normally; 'approved' is a brief transitional state before
        // the root layout's own redirect (driven by profile.approved) takes over.
        router.replace('/pending-approval');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [profile, router, refreshProfile]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
