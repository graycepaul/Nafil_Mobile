import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { formatListingPrice } from '../../components/resident/marketplace-categories';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import type { ListingStatus, ListingWithSeller, Order, OrderStatus, PublicProfile } from '../../types/database';

type OrderWithListing = Order & { listing: { title: string } | null };

const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending_transfer: 'warning',
  paid: 'info',
  completed: 'success',
  cancelled: 'danger',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_transfer: 'Awaiting transfer',
  paid: 'Paid · to fulfil',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const LISTING_STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: 'success',
  sold: 'info',
  removed: 'neutral',
  suspended: 'danger',
};

const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  active: 'active',
  sold: 'sold',
  suspended: 'suspended by admin',
  removed: 'unlisted',
};

/** Seller's own view: what sold, what's outstanding, what they've earned. Reached only by residents who have listed at least one item. */
export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['store_orders', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, listing:listings(title)')
        .eq('seller_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OrderWithListing[];
    },
    enabled: !!profile,
  });

  // profiles_select doesn't let a seller read a buyer's row directly (see
  // marketplace-listing.tsx's seller lookup for why), so buyer display names
  // come from this narrow RPC, batched across every buyer on this page.
  const buyerIds = [...new Set((orders ?? []).map((o) => o.buyer_id))];
  const { data: buyers } = useQuery({
    queryKey: ['public_profiles', buyerIds],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profiles', { profile_ids: buyerIds });
      if (error) throw error;
      return data as PublicProfile[];
    },
    enabled: buyerIds.length > 0,
  });
  const buyerById = new Map((buyers ?? []).map((b) => [b.id, b]));

  const { data: myListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['store_listings', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(full_name, unit_no)')
        .eq('seller_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ListingWithSeller[];
    },
    enabled: !!profile,
  });

  async function markCompleted(orderId: string) {
    setError(undefined);
    setCompletingId(orderId);
    const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);
    setCompletingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['store_orders', profile?.id] });
  }

  async function updateListingStatus(listingId: string, status: ListingStatus) {
    setError(undefined);
    setUpdatingListingId(listingId);
    const { error } = await supabase.from('listings').update({ status }).eq('id', listingId);
    setUpdatingListingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['store_listings', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  }

  if (ordersLoading || listingsLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const earnings = (orders ?? [])
    .filter((o) => o.status === 'paid' || o.status === 'completed')
    .reduce((sum, o) => sum + o.amount, 0);
  const activeListingCount = (myListings ?? []).filter((l) => l.status === 'active').length;

  return (
    <View className="flex-1 bg-paper-50 dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md bg-white px-lg pb-lg dark:bg-ink-bg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">My store</Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        <View className="mb-md flex-row">
          <StatCard
            icon={<Ionicons name="cash-outline" color={colors.primary} size={18} />}
            value={formatNaira(earnings).replace('.00', '')}
            label="Earnings"
          />
        </View>
        <View className="mb-xl flex-row gap-md">
          <StatCard
            icon={<Ionicons name="receipt-outline" color={colors.primary} size={18} />}
            value={(orders ?? []).length}
            label="Orders"
          />
          <StatCard
            icon={<Ionicons name="pricetag-outline" color={colors.primary} size={18} />}
            value={activeListingCount}
            label="Active listings"
          />
        </View>

        <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">Orders</Text>
        {(orders ?? []).length === 0 ? (
          <Card className="mb-xl">
            <EmptyState
              icon={<Ionicons name="receipt-outline" color={colors.textMuted} size={26} />}
              title="No orders yet"
              message="Purchases of your listings will show up here."
            />
          </Card>
        ) : (
          <View className="mb-xl gap-sm">
            {(orders ?? []).map((order) => {
              const buyer = buyerById.get(order.buyer_id);
              return (
              <Card key={order.id}>
                <View className="mb-xs flex-row items-center justify-between">
                  <StatusBadge label={ORDER_STATUS_LABEL[order.status]} tone={ORDER_STATUS_TONE[order.status]} />
                  <Text className="text-[15px] font-bold text-paper-900 dark:text-ink-text">
                    {formatNaira(order.amount)}
                  </Text>
                </View>
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {order.listing?.title ?? 'Listing'}
                </Text>
                <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {buyer?.full_name ?? 'Resident'}
                  {buyer?.unit_no ? ` · Unit ${buyer.unit_no}` : ''} · {relativeTime(order.created_at)}
                </Text>
                {order.status === 'paid' && (
                  <Button
                    label="Mark as completed"
                    onPress={() => markCompleted(order.id)}
                    loading={completingId === order.id}
                    disabled={completingId !== null && completingId !== order.id}
                    className="mt-sm"
                  />
                )}
              </Card>
              );
            })}
          </View>
        )}

        <View className="mb-md flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-paper-900 dark:text-ink-text">My listings</Text>
          <Pressable onPress={() => router.push('/resident/marketplace-new')} accessibilityRole="button">
            <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">+ New listing</Text>
          </Pressable>
        </View>
        {(myListings ?? []).length === 0 ? (
          <Card>
            <EmptyState
              icon={<Ionicons name="pricetag-outline" color={colors.textMuted} size={26} />}
              title="Nothing listed"
              message="Goods or services you list for sale will show up here."
            />
          </Card>
        ) : (
          <View className="gap-sm">
            {(myListings ?? []).map((listing) => {
              const busy = updatingListingId === listing.id;
              return (
                <Card key={listing.id}>
                  <Pressable
                    onPress={() => router.push(`/resident/marketplace-listing?id=${listing.id}`)}
                    accessibilityRole="button"
                    className="flex-row items-center gap-sm"
                  >
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-paper-900 dark:text-ink-text" numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                        {formatListingPrice(listing)}
                      </Text>
                    </View>
                    <StatusBadge label={LISTING_STATUS_LABEL[listing.status]} tone={LISTING_STATUS_TONE[listing.status]} />
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>

                  <View className="mt-sm flex-row gap-lg border-t border-paper-200 pt-sm dark:border-ink-border">
                    {listing.status === 'active' && (
                      <>
                        <Pressable
                          onPress={() => router.push(`/resident/marketplace-new?id=${listing.id}`)}
                          disabled={busy}
                          accessibilityRole="button"
                        >
                          <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => updateListingStatus(listing.id, 'sold')}
                          disabled={busy}
                          accessibilityRole="button"
                        >
                          <Text className="text-[13px] font-semibold text-success">
                            {busy ? 'Updating…' : 'Mark as sold'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => updateListingStatus(listing.id, 'removed')}
                          disabled={busy}
                          accessibilityRole="button"
                        >
                          <Text className="text-[13px] font-semibold text-paper-500 dark:text-ink-textMuted">
                            {busy ? 'Updating…' : 'Unlist'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                    {listing.status === 'removed' && (
                      <>
                        <Pressable
                          onPress={() => router.push(`/resident/marketplace-new?id=${listing.id}`)}
                          disabled={busy}
                          accessibilityRole="button"
                        >
                          <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => updateListingStatus(listing.id, 'active')}
                          disabled={busy}
                          accessibilityRole="button"
                        >
                          <Text className="text-[13px] font-semibold text-success">
                            {busy ? 'Updating…' : 'Relist'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                    {listing.status === 'sold' && (
                      <Pressable
                        onPress={() => updateListingStatus(listing.id, 'active')}
                        disabled={busy}
                        accessibilityRole="button"
                      >
                        <Text className="text-[13px] font-semibold text-success">
                          {busy ? 'Updating…' : 'Relist'}
                        </Text>
                      </Pressable>
                    )}
                    {listing.status === 'suspended' && (
                      <Text className="flex-1 text-[13px] text-paper-500 dark:text-ink-textMuted">
                        Suspended by an admin. Contact estate management if you&apos;d like to contest this.
                      </Text>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Toast message={error} tone="error" onDismiss={() => setError(undefined)} />
    </View>
  );
}
