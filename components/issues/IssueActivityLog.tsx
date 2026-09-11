import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { relativeTime } from '../../lib/format';
import type { IssueActivity, IssueStatus } from '../../types/database';

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

type ActivityWithActor = IssueActivity & { actor: { full_name: string | null } | null };

/**
 * Who changed this issue's status, and to what, in order - written only by
 * a DB trigger on `issues` itself (0047_issue_status_activity_log.sql),
 * never by this screen directly, so it can't be missed or spoofed
 * regardless of which admin/screen made the change. Same idea as GitHub's
 * issue timeline: the current status alone doesn't say who put it there.
 *
 * Polls while mounted for the same reason the admin Residents pending tab
 * and Security alerts tab do - multiple admins can act on the same issue,
 * and one of them sitting on this screen should see another's change
 * without needing to manually pull to refresh.
 */
export function IssueActivityLog({ issueId }: { issueId: string }) {
  const { data: activity } = useQuery({
    queryKey: ['issue_activity', issueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_activity')
        .select('*, actor:profiles(full_name)')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ActivityWithActor[];
    },
    refetchInterval: 15_000,
  });

  if (!activity || activity.length === 0) return null;

  return (
    <View className="mt-lg">
      <Text className="mb-sm text-base font-semibold text-paper-900 dark:text-ink-text">
        Activity
      </Text>
      <View className="gap-sm">
        {activity.map((entry) => (
          <View key={entry.id} className="flex-row items-start gap-sm">
            <View className="mt-[7px] h-[6px] w-[6px] rounded-full bg-paper-300 dark:bg-ink-border" />
            <Text className="flex-1 text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
              <Text className="font-semibold text-paper-900 dark:text-ink-text">
                {entry.actor?.full_name ?? 'Someone'}
              </Text>{' '}
              marked this{' '}
              <Text className="font-semibold text-paper-900 dark:text-ink-text">
                {STATUS_LABEL[entry.to_status]}
              </Text>{' '}
              · {relativeTime(entry.created_at)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
