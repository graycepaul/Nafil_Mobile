import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Overlay } from '../../components/ui/Overlay';
import { Toast } from '../../components/ui/Toast';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { PaymentMethodSheet, type PaymentMethod } from '../../components/resident/PaymentMethodSheet';
import { CATEGORY_ICON, MOCK_LISTINGS, MOCK_WALLET_BALANCE } from '../../components/resident/marketplace-mock';

/** Frontend-only mockup. See `wallet.tsx` for the "no backend yet" disclaimer. */
export default function MarketplaceListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string>();

  const listing = MOCK_LISTINGS.find((l) => l.id === id);

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <Text className="text-paper-900 dark:text-ink-text">Listing not found.</Text>
      </View>
    );
  }

  async function handleBuy(method: PaymentMethod) {
    await new Promise((r) => setTimeout(r, 900));
    setBuying(false);
    setNotice(
      method === 'transfer'
        ? "Thanks. We'll notify the seller once your transfer is confirmed."
        : "Purchase request sent. The seller will confirm and arrange handover."
    );
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
        <View className="mb-lg h-48 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900">
          <Ionicons name={CATEGORY_ICON[listing.category] as never} size={56} color={colors.primary} />
        </View>

        <View className="mb-xs flex-row items-center gap-sm">
          <StatusBadge label={listing.category} tone="neutral" />
          {listing.sellerType === 'vendor' && <StatusBadge label="Vendor" tone="info" />}
        </View>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">{listing.title}</Text>
        <Text className="mt-xs text-[28px] font-bold text-brand-800 dark:text-brand-300">
          {formatNaira(listing.price)}
        </Text>

        <Card className="my-lg flex-row items-center gap-sm">
          <Avatar name={listing.sellerName} size={40} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{listing.sellerName}</Text>
            <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
              {listing.sellerType === 'vendor' ? 'Estate-approved vendor' : `Resident · Unit ${listing.sellerUnit}`}
            </Text>
          </View>
        </Card>

        <Text className="mb-xs text-base font-semibold text-paper-900 dark:text-ink-text">Description</Text>
        <Text className="text-[15px] leading-[22px] text-paper-900 dark:text-ink-text">{listing.description}</Text>
        <Text className="mt-md text-[13px] text-paper-500 dark:text-ink-textMuted">
          Posted {relativeTime(listing.postedAt)}
        </Text>
      </ScrollView>

      <View className="flex-row gap-sm p-lg pt-0">
        <Button
          label="Message seller"
          variant="secondary"
          onPress={() => setNotice('Messaging isn’t available yet. Coming soon.')}
          className="flex-1"
        />
        <Button label="Buy now" onPress={() => setBuying(true)} className="flex-1" />
      </View>

      <Overlay visible={buying} onDismiss={() => setBuying(false)}>
        <PaymentMethodSheet
          title={`Buy "${listing.title}"`}
          amount={listing.price}
          methods={['wallet', 'card', 'transfer']}
          walletBalance={MOCK_WALLET_BALANCE}
          onConfirm={handleBuy}
          onCancel={() => setBuying(false)}
        />
      </Overlay>

      <Toast message={notice} tone="success" onDismiss={() => setNotice(undefined)} />
    </View>
  );
}
