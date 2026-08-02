import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SignOutButton } from '../../components/SignOutButton';
import { TicketIcon, WrenchIcon, MegaphoneIcon, ChevronRightIcon } from '../../components/ui/icons';
import type { Announcement, Estate } from '../../types/database';

export default function ResidentHome() {
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: estate } = useQuery({
    queryKey: ['my_estate', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estates')
        .select('*')
        .eq('id', profile!.estate_id!)
        .single();
      if (error) throw error;
      return data as Estate;
    },
    enabled: !!profile?.estate_id,
  });

  const { data: activePassCount } = useQuery({
    queryKey: ['dashboard_active_passes', profile?.id],
    queryFn: async () => {
      // status='pending' alone overcounts: nothing flips it to 'expired'
      // automatically (that job isn't deployed), so a lapsed pass still reads
      // 'pending' in the DB. Excluding by valid_until keeps this number honest.
      const { count } = await supabase
        .from('visitor_passes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gt('valid_until', new Date().toISOString());
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: openIssueCount } = useQuery({
    queryKey: ['dashboard_open_issues', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: latestAnnouncement } = useQuery({
    queryKey: ['dashboard_latest_announcement', profile?.estate_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as Announcement | null;
    },
    enabled: !!profile,
  });

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['dashboard_active_passes'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard_open_issues'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard_latest_announcement'] });
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.heading, { color: colors.text }]}>
            {profile?.full_name ?? 'Welcome'}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {estate?.name ?? '—'}
            {profile?.unit_no ? ` · Unit ${profile.unit_no}` : ''}
          </Text>
        </View>
      </View>

      {/* ── Quick stats ──────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        <StatCard
          icon={<TicketIcon color={colors.primary} size={18} />}
          value={activePassCount ?? '–'}
          label="Active passes"
          onPress={() => router.push('/resident/visitor-pass')}
        />
        <StatCard
          icon={<WrenchIcon color={colors.primary} size={18} />}
          value={openIssueCount ?? '–'}
          label="Open issues"
          onPress={() => router.push('/resident/issues')}
        />
      </View>

      {/* ── Quick actions ────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        <Pressable
          onPress={() => router.push('/resident/visitor-pass')}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: colors.buttonFill,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={[typography.bodyStrong, { color: colors.onButtonFill }]}>+ Visitor pass</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/resident/issues')}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={[typography.bodyStrong, { color: colors.text }]}>Report issue</Text>
        </Pressable>
      </View>

      {/* ── Latest announcement ──────────────────────────────────── */}
      <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.md }]}>
        Latest announcement
      </Text>
      {latestAnnouncement ? (
        <Pressable onPress={() => router.push('/resident/announcements')}>
          <Card accent={latestAnnouncement.severity === 'emergency' ? 'danger' : 'default'}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.md,
                  backgroundColor: colors.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MegaphoneIcon color={colors.primary} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                {latestAnnouncement.severity === 'emergency' && (
                  <View style={{ marginBottom: spacing.xs }}>
                    <StatusBadge label="Emergency" tone="danger" />
                  </View>
                )}
                <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                  {latestAnnouncement.title}
                </Text>
                <Text
                  style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}
                  numberOfLines={2}
                >
                  {latestAnnouncement.body}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
                  {relativeTime(latestAnnouncement.created_at)}
                </Text>
              </View>
              <ChevronRightIcon color={colors.textMuted} size={18} />
            </View>
          </Card>
        </Pressable>
      ) : (
        <Card>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            No announcements yet.
          </Text>
        </Card>
      )}

      <View style={{ marginTop: spacing['2xl'], alignItems: 'flex-start' }}>
        <SignOutButton />
      </View>
    </ScrollView>
  );
}
