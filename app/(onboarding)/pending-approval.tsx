import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme-context';
import { useAuthStore } from '../../store/auth-store';
import { AuthShell, AuthLink } from '../../components/auth/AuthShell';
import { ShieldIcon } from '../../components/auth/RoleIcons';
import { Button } from '../../components/ui/Button';
import type { Estate, EstateJoinRequest } from '../../types/database';

type RequestWithEstate = EstateJoinRequest & { estate: Estate | null };

/**
 * What a resident sees between submitting a join request and being approved.
 * Deliberately not a bare "pending" label on an empty tab bar — that reads as
 * broken, not as "working as intended." Shows exactly what was submitted and
 * when, so there's no doubt the request went through, plus a way to check
 * again without needing to sign out and back in.
 */
export default function PendingApprovalScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const [request, setRequest] = useState<RequestWithEstate | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('estate_join_requests')
      .select('*, estate:estates(*)')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequest((data as RequestWithEstate) ?? null);
  }, [profile]);

  useEffect(() => {
    loadRequest().finally(() => setLoading(false));
  }, [loadRequest]);

  async function handleCheckStatus() {
    setChecking(true);
    await refreshProfile(); // if now approved, the root layout's own redirect takes it from here
    await loadRequest(); // if rejected in the meantime, this screen updates in place
    setChecking(false);
  }

  if (!loading && request?.status === 'rejected') {
    return (
      <AuthShell
        title="Request declined"
        subtitle={
          request.estate
            ? `Your request to join ${request.estate.name} (unit ${request.unit_no}) wasn’t approved.`
            : 'Your request wasn’t approved.'
        }
        footer={<AuthLink label="Sign out" onPress={signOut} />}
      >
        <Text className="mb-xl text-base leading-[22px] text-paper-500 dark:text-ink-textMuted">
          Double-check the estate and unit number, then submit a new request. If you think this
          is a mistake, contact your estate admin directly.
        </Text>
        <Button label="Try again" onPress={() => router.replace('/join-estate')} />
      </AuthShell>
    );
  }

  const submittedDate = request
    ? new Date(request.created_at).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <AuthShell
      title="Your request is in review"
      subtitle="An admin at your estate needs to confirm your details before you get access."
      footer={<AuthLink label="Sign out" onPress={signOut} />}
    >
      <View className="mb-xl rounded-lg bg-brand-50 p-lg dark:bg-brand-900">
        <View className="flex-row items-center gap-md">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-800 dark:bg-brand-500">
            <ShieldIcon color={colors.onButtonFill} size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              {request?.estate?.name ?? 'Your estate'}
            </Text>
            <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
              {request ? `Unit ${request.unit_no}` : ''}
            </Text>
          </View>
        </View>

        {submittedDate && (
          <Text className="mt-md text-[13px] text-paper-500 dark:text-ink-textMuted">
            Requested {submittedDate}
          </Text>
        )}
      </View>

      <Text className="mb-xl text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
        Most requests are reviewed within a day or two. You don’t need to do anything else.
        We'll let you in as soon as it's confirmed. Check back here any time.
      </Text>

      <Button label="Check status" variant="secondary" onPress={handleCheckStatus} loading={checking} />
    </AuthShell>
  );
}
