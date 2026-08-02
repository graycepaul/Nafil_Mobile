import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/theme-context';
import { relativeTime } from '../lib/format';
import { Card } from './ui/Card';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/EmptyState';
import { MegaphoneIcon } from './ui/icons';
import type { Announcement } from '../types/database';

export function AnnouncementsFeed({
  ListHeaderComponent,
}: {
  ListHeaderComponent?: React.ReactElement;
}) {
  const { colors, spacing, typography } = useTheme();
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={ListHeaderComponent}
      data={announcements ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<MegaphoneIcon color={colors.textMuted} size={26} />}
          title="No announcements yet"
          message="Estate-wide updates will show up here."
        />
      }
      renderItem={({ item }) => {
        const isEmergency = item.severity === 'emergency';
        return (
          <Card accent={isEmergency ? 'danger' : 'default'}>
            {isEmergency && (
              <View style={{ marginBottom: spacing.xs }}>
                <StatusBadge label="Emergency" tone="danger" />
              </View>
            )}
            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
              {item.title}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
              {item.body}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
              {relativeTime(item.created_at)}
            </Text>
          </Card>
        );
      }}
    />
  );
}
