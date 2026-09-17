import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { friendlyDbError } from '../../lib/db-errors';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Overlay } from '../../components/ui/Overlay';
import { Toast } from '../../components/ui/Toast';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { DetailSkeleton } from '../../components/ui/DetailSkeleton';
import { MarketplaceCheckoutFlow } from '../../components/resident/MarketplaceCheckoutFlow';
import type { PaymentMethod } from '../../components/resident/PaymentMethodSheet';
import { CATEGORY_ICON, formatListingPrice, type ListingCategory } from '../../components/resident/marketplace-categories';
import type { Listing, PublicProfile } from '../../types/database';

export default function MarketplaceListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const heroHeight = windowWidth; // full-bleed, square-ish hero - more surface area for the photo
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string>();
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

  // profiles_select doesn't let one resident read another's row directly (it
  // would also expose resident_code, the gate QR code), so the seller's
  // display name comes from this narrow RPC instead of an embedded join.
  const { data: seller } = useQuery({
    queryKey: ['public_profile', listing?.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profiles', { profile_ids: [listing!.seller_id] });
      if (error) throw error;
      return (data as PublicProfile[])[0] ?? null;
    },
    enabled: !!listing,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <DetailSkeleton heroHeight={heroHeight} />
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

  const isOwnListing = listing.seller_id === profile?.id;
  // Older listings from before 0053 have no payout account on file - nowhere
  // for a buyer's transfer to actually go, so "Buy now" can't be offered.
  const hasPayoutAccount = !!(listing.seller_account_name && listing.seller_account_number && listing.seller_bank_name);

  // Transfer-only, straight into the seller's own account (see
  // 0053_listing_seller_payout_account.sql) - Nafil Estates never touches
  // this money, so it never goes through the shared `transfers` queue that
  // admin/finance review. The order just sits at 'pending_transfer' until
  // the seller confirms they've received it (see store.tsx).
  async function handleBuy(details: { total: number }, method: PaymentMethod) {
    setBuying(false);
    setError(undefined);

    const { error: orderErr } = await supabase.from('orders').insert({
      estate_id: profile!.estate_id,
      listing_id: listing!.id,
      seller_id: listing!.seller_id,
      buyer_id: profile!.id,
      amount: details.total,
      payment_method: method,
      status: 'pending_transfer',
    });
    if (orderErr) return setError(friendlyDbError(orderErr));
    queryClient.invalidateQueries({ queryKey: ['listing', id] });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    setNotice("Thanks. We'll let you know once the seller confirms your payment.");
  }

  function messageOnWhatsApp() {
    if (!listing!.whatsapp) return;
    Linking.openURL(`https://wa.me/${listing!.whatsapp}`);
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <ScrollView contentContainerClassName="pb-lg" bounces={false}>
        <View>
          {listing.photo_urls.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {listing.photo_urls.map((url) => (
                <RemoteImage key={url} uri={url} style={{ width: windowWidth, height: heroHeight }} />
              ))}
            </ScrollView>
          ) : (
            <View
              style={{ height: heroHeight }}
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
        </View>
      </ScrollView>

      <View className="flex-row gap-sm p-lg pt-0">
        {listing.type === 'service' && (
          <Button
            label="Message on WhatsApp"
            variant="secondary"
            onPress={messageOnWhatsApp}
            disabled={isOwnListing}
            className="flex-1"
          />
        )}
        <Button
          label={isOwnListing ? 'This is your listing' : hasPayoutAccount ? 'Buy now' : 'Payout account missing'}
          onPress={() => setBuying(true)}
          disabled={isOwnListing || !hasPayoutAccount}
          className="flex-1"
        />
      </View>

      <Overlay visible={buying} onDismiss={() => setBuying(false)}>
        <MarketplaceCheckoutFlow listing={listing} onConfirm={handleBuy} onCancel={() => setBuying(false)} />
      </Overlay>

      <Toast
        message={error ?? notice}
        tone={error ? 'error' : 'success'}
        onDismiss={() => {
          setError(undefined);
          setNotice(undefined);
        }}
      />
    </View>
  );
}
