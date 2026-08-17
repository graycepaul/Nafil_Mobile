import { useMemo, useState } from 'react';
import { View, Text, Pressable, SectionList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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

type PassWithLog = VisitorPass & { visitor_logs: { checked_in_at: string }[] };

const STATUS_TONE: Record<VisitorPassStatus, BadgeTone> = {
  pending: 'info',
  used: 'success',
  expired: 'neutral',
  revoked: 'danger',
};

type DateFilter = 'today' | '7d' | '30d' | 'all';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

function cutoffFor(filter: DateFilter): Date | null {
  const now = new Date();
  if (filter === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

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
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const { data: passes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['visitor_passes_history', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_passes')
        .select('*, visitor_logs(checked_in_at)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PassWithLog[];
    },
    enabled: !!profile,
  });

  const sections = useMemo(() => {
    const cutoff = cutoffFor(dateFilter);
    const q = search.trim().toLowerCase();
    const filtered = (passes ?? []).filter((p) => {
      if (cutoff && new Date(p.created_at) < cutoff) return false;
      return !q || p.visitor_name.toLowerCase().includes(q);
    });
    const byDay = new Map<string, PassWithLog[]>();
    for (const pass of filtered) {
      const key = dayLabel(pass.created_at);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(pass);
    }
    return Array.from(byDay.entries()).map(([title, data]) => ({ title, data }));
  }, [passes, search, dateFilter]);

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View className="flex-row items-center gap-md bg-white px-lg pb-lg pt-2xl dark:bg-ink-bg">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="flex-1 text-[22px] font-bold text-paper-900 dark:text-ink-text">
          Visit history
        </Text>
        <Pressable
          onPress={() => setFiltersOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={filtersOpen ? 'Hide date filter' : 'Filter by date'}
          hitSlop={8}
        >
          <Ionicons
            name={filtersOpen ? 'filter' : 'filter-outline'}
            color={colors.onHeaderBg}
            size={22}
          />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View className="flex-1 px-xl">
          <Input placeholder="Search by visitor name" value={search} onChangeText={setSearch} />
          {filtersOpen && (
            <View className="mb-lg flex-row flex-wrap gap-sm">
              {DATE_FILTERS.map((f) => {
                const active = dateFilter === f.key;
                return (
                  <Text
                    key={f.key}
                    onPress={() => setDateFilter(f.key)}
                    className={`rounded-full border px-md py-xs text-[13px] font-medium ${
                      active
                        ? 'border-brand-800 bg-brand-800 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-ink-bg'
                        : 'border-paper-200 text-paper-500 dark:border-ink-border dark:text-ink-textMuted'
                    }`}
                  >
                    {f.label}
                  </Text>
                );
              })}
            </View>
          )}

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
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
            renderItem={({ item }) => {
              const checkedInAt = item.visitor_logs[0]?.checked_in_at;
              return (
                <Card className="mb-sm flex-row items-center gap-md">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                      {titleCase(item.visitor_name)}
                    </Text>
                    <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                      Code: {item.code}
                      {checkedInAt
                        ? ` · In ${new Date(checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </Text>
                  </View>
                  <StatusBadge label={item.status} tone={STATUS_TONE[item.status]} />
                </Card>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}
