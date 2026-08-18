import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { Issue, IssueStatus } from '../../types/database';

const NEXT_STATUS: Record<IssueStatus, IssueStatus | null> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: null,
};

type IssueWithContext = Issue & {
  reporter: { full_name: string | null; unit_no: string | null } | null;
  estate: { name: string } | null;
};

export default function AdminIssuesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data: issues, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['issues_admin', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*, reporter:profiles!issues_resident_id_fkey(full_name, unit_no), estate:estates(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as IssueWithContext[];
    },
    enabled: !!profile,
  });

  async function advance(issue: Issue) {
    const next = NEXT_STATUS[issue.status];
    if (!next) return;
    setError(undefined);
    setAdvancingId(issue.id);
    const { error } = await supabase
      .from('issues')
      .update({
        status: next,
        resolved_at: next === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', issue.id);
    setAdvancingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['issues_admin', profile?.estate_id] });
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
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={error ? <Notice message={error} /> : null}
      data={issues ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="build-outline" color={colors.textMuted} size={26} />}
          title="No issues reported"
          message="Issues residents report will show up here."
        />
      }
      renderItem={({ item }) => {
        const next = NEXT_STATUS[item.status];
        return (
          <Card>
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              {item.category}
            </Text>
            <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
              {item.description}
            </Text>
            <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
              Reported by {item.reporter?.full_name ?? 'Unknown resident'}
              {item.reporter?.unit_no ? ` · Unit ${item.reporter.unit_no}` : ''}
              {isSuperAdmin && item.estate?.name ? ` · ${item.estate.name}` : ''}
            </Text>
            <Text
              className={`mt-sm capitalize text-[13px] text-brand-800 dark:text-brand-300 ${
                next ? 'mb-sm' : ''
              }`}
            >
              {item.status.replace('_', ' ')}
            </Text>
            {next && (
              <Button
                label={`Mark ${next.replace('_', ' ')}`}
                onPress={() => advance(item)}
                loading={advancingId === item.id}
                disabled={advancingId !== null && advancingId !== item.id}
              />
            )}
          </Card>
        );
      }}
    />
  );
}
