import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Overlay } from '../../components/ui/Overlay';
import { Toast } from '../../components/ui/Toast';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { PaymentMethodSheet, type PaymentMethod } from '../../components/resident/PaymentMethodSheet';
import {
  MOCK_DUES,
  MOCK_SUBSCRIPTION_PLANS,
  MOCK_WALLET_BALANCE,
  type DuesInfo,
} from '../../components/resident/marketplace-mock';

const DUES_STATUS_TONE: Record<DuesInfo['status'], BadgeTone> = {
  paid: 'success',
  due: 'warning',
  overdue: 'danger',
};

const DUES_STATUS_LABEL: Record<DuesInfo['status'], string> = {
  paid: 'Paid',
  due: 'Due',
  overdue: 'Overdue',
};

/**
 * Frontend-only mockup. See `wallet.tsx` for the same disclaimer. Dues and
 * subscription plans are both still being designed product-side; this exists
 * to get the payment UX approved before the backend (or even the final
 * subscription pricing) is settled.
 */
export default function DuesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [dues, setDues] = useState<DuesInfo>(MOCK_DUES);
  const [payingDues, setPayingDues] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function handlePayDues(method: PaymentMethod) {
    await new Promise((r) => setTimeout(r, 900));
    if (method === 'transfer') {
      setNotice("Thanks. We'll mark your dues as paid once the transfer is confirmed.");
    } else {
      setDues((d) => ({ ...d, status: 'paid' }));
      setNotice('Estate dues paid successfully.');
    }
    setPayingDues(false);
  }

  async function handleSubscribe(method: PaymentMethod) {
    await new Promise((r) => setTimeout(r, 900));
    setNotice(method === 'transfer' ? "Thanks. We'll activate Seller Pro once the transfer is confirmed." : 'Subscribed to Seller Pro.');
    setSubscribingPlanId(undefined);
  }

  const subscribingPlan = MOCK_SUBSCRIPTION_PLANS.find((p) => p.id === subscribingPlanId);

  return (
    <View className="flex-1 bg-paper-50 dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md bg-white px-lg pb-lg dark:bg-ink-bg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Dues & Subscription</Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        <Text className="mb-sm text-sm font-medium text-paper-500 dark:text-ink-textMuted">ESTATE DUES</Text>
        <Card className="mb-xl">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">{dues.period}</Text>
              <Text className="mt-xs text-[28px] font-bold text-paper-900 dark:text-ink-text">
                {formatNaira(dues.amountDue)}
              </Text>
            </View>
            <StatusBadge label={DUES_STATUS_LABEL[dues.status]} tone={DUES_STATUS_TONE[dues.status]} />
          </View>
          <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
            Due {new Date(dues.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          {dues.status !== 'paid' && (
            <Button label={`Pay ${formatNaira(dues.amountDue)}`} onPress={() => setPayingDues(true)} className="mt-lg" />
          )}
        </Card>

        <Text className="mb-sm text-sm font-medium text-paper-500 dark:text-ink-textMuted">
          MARKETPLACE SUBSCRIPTION
        </Text>
        <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
          Free to browse and buy. A plan unlocks selling more, or selling at all as a vendor.
        </Text>
        {MOCK_SUBSCRIPTION_PLANS.map((plan) => (
          <Card key={plan.id} className={plan.current ? '' : 'border-brand-800 dark:border-brand-300'}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-sm">
                  <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{plan.name}</Text>
                  {plan.current && <StatusBadge label="Current plan" tone="info" />}
                </View>
                <Text className="mt-xs text-[22px] font-bold text-paper-900 dark:text-ink-text">
                  {plan.price === 0 ? 'Free' : `${formatNaira(plan.price)}/${plan.interval}`}
                </Text>
              </View>
            </View>
            <View className="mt-md gap-xs">
              {plan.features.map((feature) => (
                <View key={feature} className="flex-row items-center gap-sm">
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text className="text-[13px] text-paper-900 dark:text-ink-text">{feature}</Text>
                </View>
              ))}
            </View>
            {!plan.current && (
              <Button label={`Subscribe to ${plan.name}`} onPress={() => setSubscribingPlanId(plan.id)} className="mt-lg" />
            )}
          </Card>
        ))}
      </ScrollView>

      <Overlay visible={payingDues} onDismiss={() => setPayingDues(false)}>
        <PaymentMethodSheet
          title="Pay estate dues"
          amount={dues.amountDue}
          methods={['wallet', 'card', 'transfer']}
          walletBalance={MOCK_WALLET_BALANCE}
          onConfirm={handlePayDues}
          onCancel={() => setPayingDues(false)}
        />
      </Overlay>

      <Overlay visible={!!subscribingPlan} onDismiss={() => setSubscribingPlanId(undefined)}>
        {subscribingPlan && (
          <PaymentMethodSheet
            title={`Subscribe to ${subscribingPlan.name}`}
            amount={subscribingPlan.price}
            methods={['wallet', 'card', 'transfer']}
            walletBalance={MOCK_WALLET_BALANCE}
            onConfirm={handleSubscribe}
            onCancel={() => setSubscribingPlanId(undefined)}
          />
        )}
      </Overlay>

      <Toast message={notice} tone="success" onDismiss={() => setNotice(undefined)} />
    </View>
  );
}
