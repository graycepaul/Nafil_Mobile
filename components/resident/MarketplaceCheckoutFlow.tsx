import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira } from '../../lib/format';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PaymentMethodSheet, type PaymentMethod } from './PaymentMethodSheet';
import type { Listing } from '../../types/database';

type DeliveryChoice = 'pickup' | 'delivery';

/**
 * Marketplace checkout. Goods with more than one delivery option get a
 * delivery-choice step first (its fee folds into the total); goods with only
 * one option, and all services, skip straight to payment. Mirrors
 * `DuesPaymentFlow`'s two-step shape for the same reason: the running total
 * and the choice that produces it need to live together.
 */
export function MarketplaceCheckoutFlow({
  listing,
  walletBalance,
  onConfirm,
  onCancel,
}: {
  listing: Listing;
  walletBalance: number;
  onConfirm: (details: { deliveryChoice?: DeliveryChoice; total: number }, method: PaymentMethod) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const hasDelivery = listing.type === 'good' && (listing.pickup || listing.home_delivery);
  const hasChoice = listing.type === 'good' && listing.pickup && listing.home_delivery;

  const [deliveryChoice, setDeliveryChoice] = useState<DeliveryChoice>(listing.pickup ? 'pickup' : 'delivery');
  const [step, setStep] = useState<'delivery' | 'pay'>(hasChoice ? 'delivery' : 'pay');

  const deliveryFee = deliveryChoice === 'delivery' ? listing.delivery_fee : 0;
  const total = listing.price + deliveryFee;

  if (step === 'delivery' && hasDelivery) {
    return (
      <Card className="bg-white p-lg dark:bg-ink-surface">
        <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
          Delivery method
        </Text>

        <View className="mb-lg gap-sm">
          {listing.pickup && (
            <Pressable
              onPress={() => setDeliveryChoice('pickup')}
              accessibilityRole="radio"
              accessibilityState={{ selected: deliveryChoice === 'pickup' }}
              className={`flex-row items-center gap-md rounded-md border p-md active:opacity-80 ${
                deliveryChoice === 'pickup'
                  ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-bg'
                  : 'border-paper-200 bg-paper-50 dark:border-ink-border dark:bg-ink-surface'
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                <Ionicons name="storefront-outline" size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  Pickup from seller
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  Free{listing.pickup_address ? ` · ${listing.pickup_address}` : ''}
                </Text>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
                  deliveryChoice === 'pickup'
                    ? 'border-brand-800 dark:border-brand-300'
                    : 'border-paper-200 dark:border-ink-border'
                }`}
              >
                {deliveryChoice === 'pickup' && (
                  <View className="h-[11px] w-[11px] rounded-full bg-brand-800 dark:bg-brand-300" />
                )}
              </View>
            </Pressable>
          )}

          {listing.home_delivery && (
            <Pressable
              onPress={() => setDeliveryChoice('delivery')}
              accessibilityRole="radio"
              accessibilityState={{ selected: deliveryChoice === 'delivery' }}
              className={`flex-row items-center gap-md rounded-md border p-md active:opacity-80 ${
                deliveryChoice === 'delivery'
                  ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-bg'
                  : 'border-paper-200 bg-paper-50 dark:border-ink-border dark:bg-ink-surface'
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                <Ionicons name="bicycle-outline" size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  Home delivery (within the estate)
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {listing.delivery_fee === 0 ? 'Free' : formatNaira(listing.delivery_fee)}
                </Text>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
                  deliveryChoice === 'delivery'
                    ? 'border-brand-800 dark:border-brand-300'
                    : 'border-paper-200 dark:border-ink-border'
                }`}
              >
                {deliveryChoice === 'delivery' && (
                  <View className="h-[11px] w-[11px] rounded-full bg-brand-800 dark:bg-brand-300" />
                )}
              </View>
            </Pressable>
          )}
        </View>

        <View className="mb-lg gap-xs border-t border-paper-200 pt-md dark:border-ink-border">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">Item</Text>
            <Text className="text-[13px] text-paper-900 dark:text-ink-text">{formatNaira(listing.price)}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">Delivery</Text>
            <Text className="text-[13px] text-paper-900 dark:text-ink-text">
              {deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">Total</Text>
            <Text className="text-xl font-bold text-paper-900 dark:text-ink-text">{formatNaira(total)}</Text>
          </View>
        </View>

        <View className="flex-row gap-sm">
          <Button label="Cancel" variant="ghost" onPress={onCancel} className="flex-1" />
          <Button label="Continue" onPress={() => setStep('pay')} className="flex-1" />
        </View>
      </Card>
    );
  }

  return (
    <PaymentMethodSheet
      title={`Buy "${listing.title}"`}
      amount={total}
      methods={['wallet', 'card', 'transfer']}
      walletBalance={walletBalance}
      onConfirm={(method) => onConfirm({ deliveryChoice: hasDelivery ? deliveryChoice : undefined, total }, method)}
      onCancel={onCancel}
    />
  );
}
