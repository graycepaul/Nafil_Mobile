import { View, Text, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { VisitorLog } from '../../types/database';

export default function ActiveVisitorsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, typography } = useTheme();
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
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl }}
      data={logs ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing['2xl'] }}>
          No visitors currently on-site.
        </Text>
      }
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {item.visitor_name}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              In: {new Date(item.checked_in_at).toLocaleTimeString()}
            </Text>
          </View>
          <Button label="Check out" variant="danger" onPress={() => checkOut(item.id)} />
        </Card>
      )}
    />
  );
}
