import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { AuthShell } from '../components/auth/AuthShell';
import { Button } from '../components/ui/Button';
import type { HouseholdLink, PublicProfile } from '../types/database';

/**
 * The only screen a revoked household member can reach - see the guard in
 * app/_layout.tsx. Their account still exists (audit trail: who was invited
 * by whom), it just isn't allowed to act on the unit anymore.
 */
export default function AccessRevokedScreen() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const { data: primaryName } = useQuery({
    queryKey: ['household_primary_name', profile?.id],
    queryFn: async () => {
      const { data: link } = await supabase
        .from('household_links')
        .select('primary_resident_id')
        .eq('member_id', profile!.id)
        .maybeSingle<Pick<HouseholdLink, 'primary_resident_id'>>();
      if (!link) return null;
      const { data } = await supabase.rpc('get_public_profiles', {
        profile_ids: [link.primary_resident_id],
      });
      return ((data as PublicProfile[] | null)?.[0]?.full_name ?? null) as string | null;
    },
    enabled: !!profile,
  });

  return (
    <AuthShell
      title="Your access was removed"
      subtitle={
        primaryName
          ? `${primaryName} has removed your access to their household on Nafil Estates.`
          : 'Your access to this household on Nafil Estates has been removed.'
      }
    >
      <Text className="mb-xl text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
        If you think this was a mistake, please contact them directly - only they can restore it.
      </Text>
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </AuthShell>
  );
}
