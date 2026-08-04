import { Text, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { WrenchIcon } from '../../components/ui/icons';
import type { Issue, IssueStatus } from '../../types/database';

const NEXT_STATUS: Record<IssueStatus, IssueStatus | null> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: null,
};

export default function AdminIssuesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const { data: issues } = useQuery({
    queryKey: ['issues_admin', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Issue[];
    },
    enabled: !!profile,
  });

  async function advance(issue: Issue) {
    const next = NEXT_STATUS[issue.status];
    if (!next) return;
    await supabase
      .from('issues')
      .update({
        status: next,
        resolved_at: next === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', issue.id);
    queryClient.invalidateQueries({ queryKey: ['issues_admin', profile?.estate_id] });
  }

  return (
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
      data={issues ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<WrenchIcon color={colors.textMuted} size={26} />}
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
            <Text
              className={`mt-sm capitalize text-[13px] text-brand-800 dark:text-brand-300 ${
                next ? 'mb-sm' : ''
              }`}
            >
              {item.status.replace('_', ' ')}
            </Text>
            {next && (
              <Button label={`Mark ${next.replace('_', ' ')}`} onPress={() => advance(item)} />
            )}
          </Card>
        );
      }}
    />
  );
}
