import { View, Text, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { VisitorLog } from '../../types/database';

export default function ActiveVisitorsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const { data: logs } = useQuery({
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
    await supabase
      .from('visitor_logs')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_active', profile?.estate_id] });
  }

  return (
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
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
          <Button label="Check out" variant="danger" onPress={() => checkOut(item.id)} />
        </Card>
      )}
    />
  );
}
