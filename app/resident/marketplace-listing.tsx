import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Overlay } from '../../components/ui/Overlay';
import { Toast } from '../../components/ui/Toast';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { MarketplaceCheckoutFlow } from '../../components/resident/MarketplaceCheckoutFlow';
import type { PaymentMethod } from '../../components/resident/PaymentMethodSheet';
import { CATEGORY_ICON, formatListingPrice, type ListingCategory } from '../../components/resident/marketplace-categories';
import type { Listing, PublicProfile, Wallet } from '../../types/database';

export default function MarketplaceListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const photoWidth = windowWidth - 32; // matches the scroll view's p-lg (16px) on each side
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  const { data: wallet } = useQuery({
    queryKey: ['wallet', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('wallets').select('*').eq('profile_id', profile!.id).single();
      if (error) throw error;
      return data as Wallet;
    },
    enabled: !!profile,
  });

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
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
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

  async function handleBuy(details: { total: number }, method: PaymentMethod) {
    setBuying(false);
    setError(undefined);
    const label = `Marketplace · ${listing!.title}`;

    if (method === 'transfer') {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          estate_id: profile!.estate_id,
          listing_id: listing!.id,
          seller_id: listing!.seller_id,
          buyer_id: profile!.id,
          amount: details.total,
          payment_method: 'transfer',
          status: 'pending_transfer',
        })
        .select()
        .single();
      if (orderErr) return setError(orderErr.message);
      const { error: transferErr } = await supabase.from('transfers').insert({
        estate_id: profile!.estate_id,
        profile_id: profile!.id,
        purpose: 'marketplace_order',
        reference_id: order.id,
        amount: details.total,
        label,
      });
      if (transferErr) return setError(transferErr.message);
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setNotice("Thanks. We'll notify the seller once your transfer is confirmed.");
      return;
    }

    if (method === 'wallet') {
      const { error: rpcErr } = await supabase.rpc('adjust_wallet_balance', { delta: -details.total });
      if (rpcErr) return setError(rpcErr.message);
    }
    const { error: txErr } = await supabase.from('wallet_transactions').insert({
      profile_id: profile!.id,
      label,
      amount: -details.total,
      status: 'completed',
    });
    if (txErr) return setError(txErr.message);
    const { error: orderErr } = await supabase.from('orders').insert({
      estate_id: profile!.estate_id,
      listing_id: listing!.id,
      seller_id: listing!.seller_id,
      buyer_id: profile!.id,
      amount: details.total,
      payment_method: method,
      status: 'paid',
    });
    if (orderErr) return setError(orderErr.message);
    queryClient.invalidateQueries({ queryKey: ['wallet', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['wallet_transactions', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['listing', id] });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    setNotice('Purchase complete. The seller will arrange handover.');
  }

  function messageOnWhatsApp() {
    if (!listing!.whatsapp) return;
    Linking.openURL(`https://wa.me/${listing!.whatsapp}`);
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Listing</Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        {listing.photo_urls.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="mb-lg">
            {listing.photo_urls.map((url) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={{ width: photoWidth, height: 192 }}
                className="rounded-lg bg-paper-100 dark:bg-ink-surface"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <View className="mb-lg h-48 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900">
            <Ionicons
              name={(CATEGORY_ICON[listing.category as ListingCategory] ?? 'pricetag-outline') as never}
              size={56}
              color={colors.primary}
            />
          </View>
        )}

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
      </ScrollView>

      <View className="flex-row gap-sm p-lg pt-0">
        {listing.type === 'service' && (
          <Button label="Message on WhatsApp" variant="secondary" onPress={messageOnWhatsApp} className="flex-1" />
        )}
        <Button label="Buy now" onPress={() => setBuying(true)} className="flex-1" />
      </View>

      <Overlay visible={buying} onDismiss={() => setBuying(false)}>
        <MarketplaceCheckoutFlow
          listing={listing}
          walletBalance={wallet?.balance ?? 0}
          onConfirm={handleBuy}
          onCancel={() => setBuying(false)}
        />
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
