import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { emergencyLabel } from '../../components/AnnouncementsFeed';
import type { Announcement } from '../../types/database';

/**
 * super_admin sees the exact same dashboard, just with unscoped counts —
 * these queries have no .eq('estate_id', ...) filter, so RLS alone decides
 * whether a count is "my estate" (admin) or "every estate" (super_admin).
 */
export default function AdminDashboardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data: residentCount } = useQuery({
    queryKey: ['dashboard_resident_count', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'resident')
        .eq('approved', true);
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: staffCount } = useQuery({
    queryKey: ['dashboard_staff_count', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['security', 'admin'])
        .eq('approved', true);
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

  const { data: pendingRequestCount } = useQuery({
    queryKey: ['dashboard_pending_requests', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('estate_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: latestAnnouncement } = useQuery({
    queryKey: ['dashboard_latest_announcement', profile?.id],
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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard_resident_count'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_staff_count'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_open_issues'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_pending_requests'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_latest_announcement'] }),
    ]);
    setRefreshing(false);
  }

  return (
    <ScrollView
      className="flex-1 bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text className="mb-lg text-[22px] font-bold tracking-[-0.2px] text-paper-900 dark:text-ink-text">
        {isSuperAdmin ? 'All estates' : 'Dashboard'}
      </Text>

      <View className="mb-md flex-row gap-md">
        <StatCard
          icon={<Ionicons name="people-outline" color={colors.primary} size={18} />}
          value={residentCount ?? 0}
          label="Residents"
          onPress={() => router.push('/admin/residents')}
        />
        <StatCard
          icon={<Ionicons name="shield-outline" color={colors.primary} size={18} />}
          value={staffCount ?? 0}
          label="Staff"
          onPress={() => router.push('/admin/staff')}
        />
      </View>
      <View className="mb-lg flex-row gap-md">
        <StatCard
          icon={<Ionicons name="build-outline" color={colors.primary} size={18} />}
          value={openIssueCount ?? 0}
          label="Open issues"
          onPress={() => router.push('/admin/issues')}
        />
        <StatCard
          icon={<Ionicons name="person-add-outline" color={colors.primary} size={18} />}
          value={pendingRequestCount ?? 0}
          label="Pending requests"
          onPress={() => router.push('/admin/residents')}
        />
      </View>

      <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
        Latest announcement
      </Text>
      {latestAnnouncement ? (
        <Pressable onPress={() => router.push('/admin/announcements')}>
          <Card accent={latestAnnouncement.severity === 'emergency' ? 'danger' : 'default'}>
            <View className="flex-row items-start gap-sm">
              <View className="h-8 w-8 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                <Ionicons name="megaphone-outline" color={colors.primary} size={16} />
              </View>
              <View className="flex-1">
                {latestAnnouncement.severity === 'emergency' && (
                  <View className="mb-xs">
                    <StatusBadge label={emergencyLabel(latestAnnouncement.category)} tone="danger" />
                  </View>
                )}
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text" numberOfLines={1}>
                  {latestAnnouncement.title}
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted" numberOfLines={2}>
                  {latestAnnouncement.body}
                </Text>
                <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {relativeTime(latestAnnouncement.created_at)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" color={colors.textMuted} size={18} />
            </View>
          </Card>
        </Pressable>
      ) : (
        <Card>
          <EmptyState
            icon={<Ionicons name="megaphone-outline" color={colors.textMuted} size={26} />}
            title="No announcements yet"
            message="Estate updates you post will show up here."
          />
        </Card>
      )}
    </ScrollView>
  );
}
