import { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { emergencyLabel } from '../../components/AnnouncementsFeed';
import type { Announcement, Estate } from '../../types/database';

/**
 * super_admin sees the exact same dashboard, just with unscoped counts.
 * These queries have no .eq('estate_id', ...) filter, so RLS alone decides
 * whether a count is "my estate" (admin) or "every estate" (super_admin).
 */
export default function AdminDashboardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const isSuperAdmin = profile?.role === 'super_admin';

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

  const { data: listingCount } = useQuery({
    queryKey: ['dashboard_listing_count', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: pendingTransferCount } = useQuery({
    queryKey: ['dashboard_pending_transfers', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('transfers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: outstandingDuesCount } = useQuery({
    queryKey: ['dashboard_outstanding_dues', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('dues')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'paid');
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: recentAnnouncements } = useQuery({
    queryKey: ['dashboard_recent_announcements', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*, estate:estates(name)')
        .order('created_at', { ascending: false })
        .limit(3);
      return (data ?? []) as (Announcement & { estate: { name: string } | null })[];
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
      queryClient.invalidateQueries({ queryKey: ['dashboard_listing_count'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_pending_transfers'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_outstanding_dues'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_recent_announcements'] }),
    ]);
    setRefreshing(false);
  }

  return (
    <ScrollView
      className="flex-1 bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Card className="mb-lg">
        <View className="flex-row items-center gap-md">
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={56} />
          <View className="flex-1">
            <Text className="text-[22px] font-bold tracking-[-0.2px] text-paper-900 dark:text-ink-text">
              {profile?.full_name ?? 'Welcome back'}
            </Text>
            {isSuperAdmin ? (
              <View className="mt-1 flex-row items-center gap-xs self-start rounded-full bg-brand-50 px-sm py-[2px] dark:bg-brand-900">
                <Ionicons name="globe-outline" color={colors.primary} size={12} />
                <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">
                  Viewing all estates
                </Text>
              </View>
            ) : (
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                {estate?.name ?? '...fetching estate'}
              </Text>
            )}
          </View>
        </View>
        <View className="mt-lg flex-row gap-md">
          <Pressable
            onPress={() => router.push('/admin/staff?invite=1')}
            className="flex-1 items-center rounded-md bg-brand-800 py-md active:opacity-90 dark:bg-brand-500"
          >
            <Text className="text-base font-semibold text-white">+ Invite staff</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/admin/announcements')}
            className="flex-1 items-center rounded-md border border-paper-200 bg-paper-50 py-md active:opacity-80 dark:border-ink-border dark:bg-ink-surface"
          >
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              Post announcement
            </Text>
          </Pressable>
        </View>
      </Card>

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
      <View className="mb-md flex-row gap-md">
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
          onPress={() => router.push('/admin/residents?tab=pending')}
        />
      </View>
      <View className="mb-lg flex-row gap-md">
        <StatCard
          icon={<Ionicons name="storefront-outline" color={colors.primary} size={18} />}
          value={listingCount ?? 0}
          label="Marketplace listings"
          onPress={() => router.push('/admin/marketplace')}
        />
        <StatCard
          icon={<Ionicons name="swap-horizontal-outline" color={colors.primary} size={18} />}
          value={pendingTransferCount ?? 0}
          label="Pending transfers"
          onPress={() => router.push('/admin/transfers')}
        />
      </View>
      <View className="mb-lg flex-row gap-md">
        <StatCard
          icon={<Ionicons name="receipt-outline" color={colors.primary} size={18} />}
          value={outstandingDuesCount ?? 0}
          label="Outstanding dues"
          onPress={() => router.push('/admin/dues')}
        />
        <View className="flex-1" />
      </View>

      <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
        Latest announcements
      </Text>
      {recentAnnouncements && recentAnnouncements.length > 0 ? (
        <View className="gap-md">
          {recentAnnouncements.map((announcement) => (
            <Pressable key={announcement.id} onPress={() => router.push('/admin/announcements')}>
              <Card accent={announcement.severity === 'emergency' ? 'danger' : 'default'}>
                <View className="flex-row items-start gap-sm">
                  <View className="h-8 w-8 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                    <Ionicons name="megaphone-outline" color={colors.primary} size={16} />
                  </View>
                  <View className="flex-1">
                    {announcement.severity === 'emergency' && (
                      <View className="mb-xs">
                        <StatusBadge label={emergencyLabel(announcement.category)} tone="danger" />
                      </View>
                    )}
                    <Text className="text-base font-semibold text-paper-900 dark:text-ink-text" numberOfLines={1}>
                      {announcement.title}
                    </Text>
                    <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted" numberOfLines={2}>
                      {announcement.body}
                    </Text>
                    <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                      {relativeTime(announcement.created_at)}
                      {isSuperAdmin && announcement.estate?.name ? ` · ${announcement.estate.name}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" color={colors.textMuted} size={18} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
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
