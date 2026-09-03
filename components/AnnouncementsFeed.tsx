import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { useTheme } from '../context/theme-context';
import { relativeTime } from '../lib/format';
import { Card } from './ui/Card';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { ALERT_CATEGORIES } from './AlertCategoryPicker';
import type { Announcement } from '../types/database';

export function emergencyLabel(category: Announcement['category']) {
  if (!category || category === 'other') return 'Emergency';
  return ALERT_CATEGORIES.find((c) => c.value === category)?.label ?? 'Emergency';
}

export type AnnouncementSort = 'date' | 'type' | 'estate';

function sortAnnouncements<T extends Announcement & { estate: { name: string } | null }>(
  items: T[],
  sortBy: AnnouncementSort
): T[] {
  if (sortBy === 'date') return items;
  const byDateDesc = (a: T, b: T) => b.created_at.localeCompare(a.created_at);
  if (sortBy === 'estate') {
    return [...items].sort(
      (a, b) => (a.estate?.name ?? '').localeCompare(b.estate?.name ?? '') || byDateDesc(a, b)
    );
  }
  // 'type': emergencies first (grouped by category), then plain announcements.
  return [...items].sort((a, b) => {
    const aEmergency = a.severity === 'emergency';
    const bEmergency = b.severity === 'emergency';
    if (aEmergency !== bEmergency) return aEmergency ? -1 : 1;
    if (aEmergency && bEmergency) {
      const cat = emergencyLabel(a.category).localeCompare(emergencyLabel(b.category));
      if (cat !== 0) return cat;
    }
    return byDateDesc(a, b);
  });
}

export function AnnouncementsFeed({
  ListHeaderComponent,
  showEstate,
  sortBy = 'date',
  search = '',
  estateFilter,
}: {
  ListHeaderComponent?: React.ReactElement;
  /** super_admin only — the feed is cross-estate for them, so each card needs to say which estate it's from. */
  showEstate?: boolean;
  sortBy?: AnnouncementSort;
  search?: string;
  estateFilter?: string;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const role = useAuthStore((s) => s.profile?.role);
  // Only residents and admin-family roles (admin/super_admin/finance) ever
  // render this feed — security has no announcements screen at all — so
  // this binary covers every real caller without needing a route prop
  // threaded through both call sites.
  const detailBase = role === 'resident' ? '/resident/announcement-detail' : '/admin/announcement-detail';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, estate:estates(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Announcement & { estate: { name: string } | null })[];
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = (announcements ?? []).filter((a) => {
    if (estateFilter && a.estate_id !== estateFilter) return false;
    if (q && !a.title.toLowerCase().includes(q) && !a.body.toLowerCase().includes(q)) return false;
    return true;
  });
  const sorted = sortAnnouncements(filtered, sortBy);

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['announcements'] });
    setRefreshing(false);
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={ListHeaderComponent}
      data={sorted}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="megaphone-outline" color={colors.textMuted} size={26} />}
          title="No announcements yet"
          message="Estate-wide updates will show up here."
        />
      }
      renderItem={({ item }) => {
        const isEmergency = item.severity === 'emergency';
        return (
          <Pressable onPress={() => router.push(`${detailBase}?id=${item.id}`)}>
            <Card accent={isEmergency ? 'danger' : 'default'}>
              {isEmergency && (
                <View className="mb-xs">
                  <StatusBadge label={emergencyLabel(item.category)} tone="danger" />
                </View>
              )}
              <Text className="text-base font-bold text-paper-900 dark:text-ink-text">{item.title}</Text>
              <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted" numberOfLines={1}>
                {item.body}
              </Text>
              <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
                {relativeTime(item.created_at)}
                {showEstate && item.estate?.name ? ` · ${item.estate.name}` : ''}
              </Text>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
