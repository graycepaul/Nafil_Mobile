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
  const { colors, spacing, radius, typography } = useTheme();
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
        <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 22 }]}>
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
      <View
        style={{
          backgroundColor: colors.primaryMuted,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.full,
              backgroundColor: colors.buttonFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldIcon color={colors.onButtonFill} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>
              {request?.estate?.name ?? 'Your estate'}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {request ? `Unit ${request.unit_no}` : ''}
            </Text>
          </View>
        </View>

        {submittedDate && (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
            Requested {submittedDate}
          </Text>
        )}
      </View>

      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 19 }]}>
        Most requests are reviewed within a day or two. You don’t need to do anything else.
        We'll let you in as soon as it's confirmed. Check back here any time.
      </Text>

      <Button label="Check status" variant="secondary" onPress={handleCheckStatus} loading={checking} />
    </AuthShell>
  );
}
