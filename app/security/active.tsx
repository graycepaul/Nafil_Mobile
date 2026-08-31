import { useMemo, useState } from 'react';
import { View, Text, SectionList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { VisitorLog } from '../../types/database';

/**
 * Same day-bucket convention as chat apps: "Today"/"Yesterday" for the
 * obvious cases, the weekday name inside the last week (clearer than a raw
 * date), then a plain date further out. Almost everyone checks out same-day,
 * so this only really shows up for the rare visitor who's still on-site
 * from an earlier day.
 */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ActiveVisitorsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['visitor_logs_active', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select('*')
        .is('checked_out_at', null)
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return data as VisitorLog[];
    },
    enabled: !!profile,
  });

  const sections = useMemo(() => {
    const byDay = new Map<string, VisitorLog[]>();
    for (const log of logs ?? []) {
      const key = dayLabel(log.checked_in_at);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(log);
    }
    return Array.from(byDay.entries()).map(([title, data]) => ({ title, data }));
  }, [logs]);

  async function checkOut(id: string) {
    setError(undefined);
    setCheckingOutId(id);
    const { error } = await supabase
      .from('visitor_logs')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', id);
    setCheckingOutId(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_active', profile?.estate_id] });
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_all', profile?.estate_id] });
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 px-xl bg-white dark:bg-ink-bg">
      <SectionList
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={error ? <Notice message={error} /> : null}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="time-outline" color={colors.textMuted} size={26} />}
            title="No one on-site"
            message="Checked-in visitors will show up here until they check out."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-sm bg-white py-sm text-sm font-semibold text-paper-500 dark:bg-ink-bg dark:text-ink-textMuted">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Card className="mb-sm flex-row items-center">
            <View className="flex-1">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                {item.visitor_name}
              </Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                In: {new Date(item.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Button
              label="Check out"
              variant="danger"
              onPress={() => checkOut(item.id)}
              loading={checkingOutId === item.id}
              disabled={checkingOutId !== null && checkingOutId !== item.id}
            />
          </Card>
        )}
      />
    </View>
  );
}
