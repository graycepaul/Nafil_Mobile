import { useMemo, useState } from 'react';
import { View, Text, SectionList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import type { VisitorLog } from '../../types/database';

type DateFilter = 'today' | '7d' | '30d' | 'all';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

const METHOD_ICON: Record<VisitorLog['method'], IoniconsIconName> = {
  qr: 'qr-code-outline',
  code: 'keypad-outline',
  manual: 'create-outline',
};

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
 * The full check-in/check-out register, not just who's currently on-site
 * (that's the "On-site" tab). Exists so security or an admin investigating
 * an incident can answer "who came in, and when" for any past date, not just
 * right now.
 */
export default function VisitorLogsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('7d');

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['visitor_logs_all', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select('*')
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return data as VisitorLog[];
    },
    enabled: !!profile,
  });

  const sections = useMemo(() => {
    const cutoff = cutoffFor(dateFilter);
    const q = search.trim().toLowerCase();

    const filtered = (logs ?? []).filter((log) => {
      if (cutoff && new Date(log.checked_in_at) < cutoff) return false;
      if (!q) return true;
      return (
        log.visitor_name.toLowerCase().includes(q) ||
        (log.vehicle_plate?.toLowerCase().includes(q) ?? false)
      );
    });

    const byDay = new Map<string, VisitorLog[]>();
    for (const log of filtered) {
      const key = dayLabel(log.checked_in_at);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(log);
    }
    return Array.from(byDay.entries()).map(([title, data]) => ({ title, data }));
  }, [logs, search, dateFilter]);

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
        <Input
          placeholder="Search by visitor name or plate number"
          value={search}
          onChangeText={setSearch}
        />
        <View className="mb-lg flex-row gap-sm">
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
      </View>

      <SectionList
        contentContainerClassName="px-xl pb-xl"
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="file-tray-stacked-outline" color={colors.textMuted} size={26} />}
            title="No visitor activity"
            message="Nothing matches your search and filter for this period."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-sm bg-white py-sm text-sm font-semibold text-paper-500 dark:bg-ink-bg dark:text-ink-textMuted">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Card className="mb-sm flex-row items-center gap-md">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-paper-100 dark:bg-ink-bg">
              <Ionicons name={METHOD_ICON[item.method]} color={colors.textMuted} size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                {item.visitor_name}
              </Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                {item.vehicle_plate ? `${item.vehicle_plate} · ` : ''}In{' '}
                {new Date(item.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {item.checked_out_at
                  ? ` · Out ${new Date(item.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ' · Still on-site'}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
