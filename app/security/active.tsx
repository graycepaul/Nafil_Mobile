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
import type { VisitorLog } from '../../types/database';

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
      data={logs ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="time-outline" color={colors.textMuted} size={26} />}
          title="No one on-site"
          message="Checked-in visitors will show up here until they check out."
        />
      }
      renderItem={({ item }) => (
        <Card className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              {item.visitor_name}
            </Text>
            <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
              In: {new Date(item.checked_in_at).toLocaleTimeString()}
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
  );
}
