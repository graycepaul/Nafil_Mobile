import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import type { WalletTransaction } from '../../types/database';

/** Full wallet history, reached via "See all" on the Wallet screen. */
export default function WalletTransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['wallet_transactions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!profile,
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-paper-50 dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md bg-white px-lg pb-lg dark:bg-ink-bg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">All transactions</Text>
      </View>

      <FlatList
        contentContainerClassName="p-lg"
        data={transactions ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon={<Ionicons name="wallet-outline" color={colors.textMuted} size={26} />}
              title="No activity yet"
              message="Top-ups and payments made from your wallet will show up here."
            />
          </Card>
        }
        renderItem={({ item: tx }) => (
          <Card className="flex-row items-center gap-sm">
            <View
              className={`h-9 w-9 items-center justify-center rounded-md ${
                tx.amount >= 0 ? 'bg-success-muted dark:bg-success-mutedDark' : 'bg-paper-100 dark:bg-ink-raised'
              }`}
            >
              <Ionicons
                name={tx.amount >= 0 ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={16}
                color={tx.amount >= 0 ? colors.success : colors.textMuted}
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{tx.label}</Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                {relativeTime(tx.created_at)}
                {tx.status === 'pending' ? ' · Pending' : ''}
              </Text>
            </View>
            <Text
              className={`text-base font-semibold ${
                tx.amount >= 0 ? 'text-success' : 'text-paper-900 dark:text-ink-text'
              }`}
            >
              {tx.amount >= 0 ? '+' : '-'}
              {formatNaira(Math.abs(tx.amount))}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}
