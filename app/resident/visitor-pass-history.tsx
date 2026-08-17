import { useMemo, useState } from 'react';
import { View, Text, SectionList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { titleCase } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { VisitorPass, VisitorPassStatus } from '../../types/database';

const STATUS_TONE: Record<VisitorPassStatus, BadgeTone> = {
  pending: 'info',
  used: 'success',
  expired: 'neutral',
  revoked: 'danger',
};

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Every pass this resident has ever generated, not just the most recent 20
 * shown on the main Visitors tab. Grouped by day and searchable, the same
 * pattern as security's Logs register.
 */
export default function VisitorPassHistoryScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const { data: passes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['visitor_passes_history', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_passes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as VisitorPass[];
    },
    enabled: !!profile,
  });

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = (passes ?? []).filter(
      (p) => !q || p.visitor_name.toLowerCase().includes(q)
    );
    const byDay = new Map<string, VisitorPass[]>();
    for (const pass of filtered) {
      const key = dayLabel(pass.created_at);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(pass);
    }
    return Array.from(byDay.entries()).map(([title, data]) => ({ title, data }));
  }, [passes, search]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View className="px-xl pt-xl">
        <Input placeholder="Search by visitor name" value={search} onChangeText={setSearch} />
      </View>

      <SectionList
        contentContainerClassName="px-xl pb-xl"
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="time-outline" color={colors.textMuted} size={26} />}
            title="No visit history"
            message="Passes you've generated will show up here."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-sm bg-white py-sm text-sm font-semibold text-paper-500 dark:bg-ink-bg dark:text-ink-textMuted">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Card className="mb-sm flex-row items-center gap-md">
            <View className="flex-1">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                {titleCase(item.visitor_name)}
              </Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                Code: {item.code}
              </Text>
            </View>
            <StatusBadge label={item.status} tone={STATUS_TONE[item.status]} />
          </Card>
        )}
      />
    </View>
  );
}
