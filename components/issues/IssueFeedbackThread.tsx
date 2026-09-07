import { useState } from 'react';
import { View, Text } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { relativeTime } from '../../lib/format';
import { friendlyDbError } from '../../lib/db-errors';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Notice } from '../ui/Notice';
import type { IssueComment } from '../../types/database';

interface IssueFeedbackThreadProps {
  issueId: string;
  /** Only true while the issue is 'resolved' - RLS enforces this too, this just keeps the compose box from appearing where it'd be rejected. */
  canPost: boolean;
}

type CommentWithAuthor = IssueComment & { author: { full_name: string | null } | null };

/**
 * The back-and-forth that opens once an issue is marked resolved and closes
 * the moment it's actually closed - same component on both the resident and
 * admin issue-detail screens, since the thread itself doesn't differ by role,
 * only who's allowed to close the issue does.
 */
export function IssueFeedbackThread({ issueId, canPost }: IssueFeedbackThreadProps) {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['issue_comments', issueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_comments')
        .select('*, author:profiles(full_name)')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CommentWithAuthor[];
    },
  });

  async function send() {
    if (!profile || !draft.trim()) return;
    setError(undefined);
    setSending(true);
    const { error } = await supabase.from('issue_comments').insert({
      issue_id: issueId,
      author_id: profile.id,
      body: draft.trim(),
    });
    setSending(false);
    if (error) {
      setError(friendlyDbError(error));
      return;
    }
    setDraft('');
    queryClient.invalidateQueries({ queryKey: ['issue_comments', issueId] });
  }

  return (
    <View className="mt-lg">
      <Text className="mb-sm text-base font-semibold text-paper-900 dark:text-ink-text">
        Feedback
      </Text>

      {error && <Notice message={error} />}

      {isLoading ? (
        <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">Loading…</Text>
      ) : comments && comments.length > 0 ? (
        <View className="gap-sm">
          {comments.map((comment) => {
            const isMine = comment.author_id === profile?.id;
            return (
              <View key={comment.id} className={isMine ? 'items-end' : 'items-start'}>
                {!isMine && (
                  <Text className="mb-[2px] ml-xs text-[12px] font-semibold text-paper-500 dark:text-ink-textMuted">
                    {comment.author?.full_name ?? 'Unknown'}
                  </Text>
                )}
                <View
                  className={`max-w-[85%] rounded-lg px-md py-sm ${
                    isMine
                      ? 'rounded-tr-none bg-brand-800 dark:bg-brand-300'
                      : 'rounded-tl-none bg-paper-100 dark:bg-ink-surface'
                  }`}
                >
                  <Text
                    className={`text-[14px] leading-[20px] ${
                      isMine ? 'text-white dark:text-ink-bg' : 'text-paper-900 dark:text-ink-text'
                    }`}
                  >
                    {comment.body}
                  </Text>
                </View>
                <Text className="mt-[2px] text-[11px] text-paper-400 dark:text-ink-textMuted">
                  {relativeTime(comment.created_at)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">
          No feedback yet.
        </Text>
      )}

      {canPost && (
        <View className="mt-md">
          <Input
            placeholder="Write a message…"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Button
            label="Send"
            onPress={send}
            loading={sending}
            disabled={!draft.trim()}
            className="mt-sm"
          />
        </View>
      )}
    </View>
  );
}
