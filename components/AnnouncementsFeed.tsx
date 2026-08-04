import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/theme-context';
import { relativeTime } from '../lib/format';
import { Card } from './ui/Card';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { Announcement } from '../types/database';

export function AnnouncementsFeed({
  ListHeaderComponent,
}: {
  ListHeaderComponent?: React.ReactElement;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={ListHeaderComponent}
      data={announcements ?? []}
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
          <Card accent={isEmergency ? 'danger' : 'default'}>
            {isEmergency && (
              <View className="mb-xs">
                <StatusBadge label="Emergency" tone="danger" />
              </View>
            )}
            <Text className="text-base font-bold text-paper-900 dark:text-ink-text">{item.title}</Text>
            <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">{item.body}</Text>
            <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
              {relativeTime(item.created_at)}
            </Text>
          </Card>
        );
      }}
    />
  );
}
