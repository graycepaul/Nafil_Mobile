import { useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { DetailSkeleton } from '../../components/ui/DetailSkeleton';
import { Toast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { CATEGORY_ICON, formatListingPrice, type ListingCategory } from '../../components/resident/marketplace-categories';
import type { Listing, ListingStatus, PublicProfile } from '../../types/database';

const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: 'success',
  sold: 'info',
  removed: 'neutral',
  suspended: 'danger',
};

/** Read-only listing detail for super_admin/finance — no buy flow, just moderation. */
export default function AdminMarketplaceListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [confirmingAction, setConfirmingAction] = useState<'suspend' | 'lift' | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('listings').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Listing;
    },
    enabled: !!id,
  });

  const { data: seller } = useQuery({
    queryKey: ['public_profile', listing?.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profiles', { profile_ids: [listing!.seller_id] });
      if (error) throw error;
      return (data as PublicProfile[])[0] ?? null;
    },
    enabled: !!listing,
  });

  async function handleConfirm() {
    if (!confirmingAction || !listing) return;
    setError(undefined);
    setUpdating(true);
    const nextStatus = confirmingAction === 'suspend' ? 'suspended' : 'active';
    const { error: updateError } = await supabase.from('listings').update({ status: nextStatus }).eq('id', listing.id);
    setUpdating(false);
    setConfirmingAction(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['listing', id] });
    queryClient.invalidateQueries({ queryKey: ['listings_admin'] });
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <DetailSkeleton heroHeight={windowWidth} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <Text className="text-paper-900 dark:text-ink-text">Listing not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <ScrollView contentContainerClassName="pb-lg" bounces={false}>
        <View>
          {listing.photo_urls.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {listing.photo_urls.map((url) => (
                <RemoteImage key={url} uri={url} style={{ width: windowWidth, height: windowWidth }} />
              ))}
            </ScrollView>
          ) : (
            <View
              style={{ height: windowWidth }}
              className="items-center justify-center bg-brand-50 dark:bg-brand-900"
            >
              <Ionicons
                name={(CATEGORY_ICON[listing.category as ListingCategory] ?? 'pricetag-outline') as never}
                size={72}
                color={colors.primary}
              />
            </View>
          )}
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={{ top: insets.top + 12 }}
            className="absolute left-lg h-10 w-10 items-center justify-center rounded-full bg-black/40"
          >
            <Ionicons name="arrow-back" color="#fff" size={22} />
          </Pressable>
        </View>

        <View className="p-lg">
          <View className="mb-xs flex-row items-center gap-sm">
            <StatusBadge label={listing.status} tone={STATUS_TONE[listing.status]} />
            <StatusBadge label={listing.category} tone="neutral" />
          </View>
          <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">{listing.title}</Text>
          <Text className="mt-xs text-[28px] font-bold text-brand-800 dark:text-brand-300">
            {formatListingPrice(listing)}
          </Text>

          <Card className="my-lg flex-row items-center gap-sm">
            <Avatar name={seller?.full_name} size={40} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                {seller?.full_name ?? 'Resident'}
              </Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                {seller?.unit_no ? `Resident · Unit ${seller.unit_no}` : 'Resident'}
              </Text>
            </View>
          </Card>

          {listing.type === 'good' && (listing.pickup || listing.home_delivery) && (
            <Card className="mb-lg">
              <Text className="mb-sm text-base font-semibold text-paper-900 dark:text-ink-text">Delivery</Text>
              {listing.pickup && (
                <View className="mb-xs flex-row items-start gap-sm">
                  <Ionicons name="storefront-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-[13px] text-paper-900 dark:text-ink-text">
                    Pickup from seller · Free
                    {listing.pickup_address ? `\n${listing.pickup_address}` : ''}
                  </Text>
                </View>
              )}
              {listing.home_delivery && (
                <View className="flex-row items-center gap-sm">
                  <Ionicons name="bicycle-outline" size={16} color={colors.textMuted} />
                  <Text className="text-[13px] text-paper-900 dark:text-ink-text">
                    Home delivery (within the estate) ·{' '}
                    {listing.delivery_fee === 0 ? 'Free' : formatNaira(listing.delivery_fee)}
                  </Text>
                </View>
              )}
            </Card>
          )}

          <Text className="mb-xs text-base font-semibold text-paper-900 dark:text-ink-text">Description</Text>
          <Text className="text-[15px] leading-[22px] text-paper-900 dark:text-ink-text">{listing.description}</Text>
          <Text className="mt-md text-[13px] text-paper-500 dark:text-ink-textMuted">
            Posted {relativeTime(listing.created_at)}
          </Text>

          {(listing.status === 'active' || listing.status === 'suspended') && (
            <Button
              label={listing.status === 'active' ? 'Suspend listing' : 'Lift suspension'}
              variant={listing.status === 'active' ? 'danger' : 'primary'}
              onPress={() => setConfirmingAction(listing.status === 'active' ? 'suspend' : 'lift')}
              className="mt-lg"
            />
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={!!confirmingAction}
        title={confirmingAction === 'suspend' ? 'Suspend this listing?' : 'Lift the suspension?'}
        message={
          confirmingAction === 'suspend'
            ? `"${listing.title}" will no longer be shown in the marketplace. The seller will be notified and can contact estate management to contest this.`
            : `"${listing.title}" will be visible in the marketplace again. The seller will be notified.`
        }
        confirmLabel={confirmingAction === 'suspend' ? 'Suspend' : 'Lift suspension'}
        destructive={confirmingAction === 'suspend'}
        loading={updating}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmingAction(null)}
      />

      <Toast message={error} tone="error" onDismiss={() => setError(undefined)} />
    </View>
  );
}
