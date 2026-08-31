import { useState } from 'react';
import { View, Text } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Notice } from '../ui/Notice';
import type { ScheduledVisit } from '../../types/database';

/**
 * The no-code path: a resident schedules a visit ahead of time, and the
 * visitor just gives their name at the gate instead of carrying a code.
 * Search rather than a single lookup because a common name might match more
 * than one scheduled visit. Security picks the right one and confirms.
 */
export function ScheduledVisitLookup() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const { data: visits, refetch } = useQuery({
    queryKey: ['scheduled_visits_search', profile?.estate_id, query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_visits')
        .select('*')
        .eq('status', 'pending')
        .ilike('visitor_name', `%${query.trim()}%`)
        .order('scheduled_for', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data as ScheduledVisit[];
    },
    enabled: !!profile && query.trim().length > 1,
  });

  async function grantAccess(visit: ScheduledVisit) {
    setError(undefined);
    setNotice(undefined);
    setCheckingInId(visit.id);
    const { error } = await supabase.rpc('check_in_scheduled_visit', { visit_id: visit.id });
    setCheckingInId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice(`${visit.visitor_name} checked in.`);
    setQuery('');
    refetch();
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_all'] });
  }

  return (
    <View className="mt-lg">
      <Text className="mb-sm text-[13px] font-medium text-paper-500 dark:text-ink-textMuted">
        Or check a scheduled visit by name
      </Text>
      {error && <Notice message={error} />}
      {notice && <Notice tone="success" message={notice} />}
      <Input placeholder="Visitor's name" value={query} onChangeText={setQuery} />
      {visits?.map((visit) => (
        <Card key={visit.id} className="mb-sm flex-row items-center gap-md">
          <View className="flex-1">
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              {visit.visitor_name}
            </Text>
            <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
              Expected{' '}
              {new Date(visit.scheduled_for).toLocaleString(undefined, {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {visit.description ? ` · ${visit.description}` : ''}
            </Text>
          </View>
          <Button
            label="Grant access"
            loading={checkingInId === visit.id}
            disabled={checkingInId !== null && checkingInId !== visit.id}
            onPress={() => grantAccess(visit)}
          />
        </Card>
      ))}
      {query.trim().length > 1 && visits?.length === 0 && (
        <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">
          No scheduled visit matches that name.
        </Text>
      )}
    </View>
  );
}
