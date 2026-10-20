import { useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { cancelOrder } from '../../lib/orders';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import { Toast } from '../../components/ui/Toast';
import type { Order, OrderStatus } from '../../types/database';

type OrderWithListing = Order & { listing: { title: string } | null };

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending_transfer: 'warning',
  paid: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_transfer: 'Awaiting transfer',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** The buyer's side of the marketplace: what they ordered, and cancelling an order that has not been paid. */
export default function PurchasesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [pendingCancel, setPendingCancel] = useState<OrderWithListing | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string>();

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my_purchases', profile?.id],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*, listing:listings(title)')
        .eq('buyer_id', profile!.id)
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      return data as OrderWithListing[];
    },
    enabled: !!profile,
  });

  async function confirmCancel() {
    if (!pendingCancel) return;
    setCancelling(true);
    const message = await cancelOrder(supabase, pendingCancel.id);
    setCancelling(false);
    setPendingCancel(null);
    if (message) {
      setError(message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['my_purchases', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View style={{ paddingTop: insets.top + 16 }} className="flex-row items-center gap-md px-lg pb-lg">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">My purchases</Text>
      </View>

      {isLoading ? (
        <CardSkeletonList />
      ) : (
        <FlatList
          contentContainerClassName="p-lg"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          data={orders ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="receipt-outline" color={colors.textMuted} size={26} />}
              title="No purchases yet"
              message="Things you buy from the marketplace will show up here."
            />
          }
          renderItem={({ item }) => (
            <Card>
              <View className="mb-xs flex-row items-center justify-between">
                <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
                <Text className="text-[15px] font-bold text-paper-900 dark:text-ink-text">{formatNaira(item.amount)}</Text>
              </View>
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                {item.listing?.title ?? 'Listing'}
              </Text>
              <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                Ordered {relativeTime(item.created_at)}
              </Text>
              {item.status === 'pending_transfer' && (
                <Button
                  label="Cancel order"
                  variant="secondary"
                  onPress={() => setPendingCancel(item)}
                  className="mt-md"
                />
              )}
            </Card>
          )}
        />
      )}

      <ConfirmDialog
        visible={!!pendingCancel}
        title="Cancel this order?"
        message={
          pendingCancel
            ? `${pendingCancel.listing?.title ?? 'This order'} will go back on sale. If you have already sent the transfer, contact the seller before cancelling.`
            : undefined
        }
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setPendingCancel(null)}
      />

      <Toast message={error} tone="error" onDismiss={() => setError(undefined)} />
    </View>
  );
}
