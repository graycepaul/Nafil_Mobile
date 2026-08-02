import { Text, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Issue, IssueStatus } from '../../types/database';

const NEXT_STATUS: Record<IssueStatus, IssueStatus | null> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: null,
};

export default function AdminIssuesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, typography } = useTheme();
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
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl }}
      data={issues ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing['2xl'] }}>
          No issues reported.
        </Text>
      }
      renderItem={({ item }) => {
        const next = NEXT_STATUS[item.status];
        return (
          <Card>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {item.category}
            </Text>
            <Text
              style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}
            >
              {item.description}
            </Text>
            <Text
              style={[
                typography.caption,
                {
                  color: colors.primary,
                  marginTop: spacing.sm,
                  marginBottom: next ? spacing.sm : 0,
                  textTransform: 'capitalize',
                },
              ]}
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
