import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme-context';
import { useAuthStore } from '../store/auth-store';
import { Card } from '../components/ui/Card';
import { ArrowLeftIcon } from '../components/ui/icons';

/**
 * Shared across every role, same reasoning as /settings — nothing here is
 * role-specific. There's no support-ticket system yet, so this is a direct
 * line to the estate's own admin/management contact rather than a fake
 * "submit a ticket" flow that goes nowhere.
 */
export default function SupportScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();

  const email = 'support@nafilestates.com';

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View className="flex-row items-center gap-md border-b border-paper-200 px-lg pb-lg pt-2xl dark:border-ink-border">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ArrowLeftIcon color={colors.text} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Support</Text>
      </View>

      <ScrollView contentContainerClassName="p-xl">
        {profile?.role === 'resident' && (
          <Card className="mb-lg">
            <Text className="mb-xs text-base font-semibold text-paper-900 dark:text-ink-text">
              Something broken at home?
            </Text>
            <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
              Maintenance and estate issues go through Issues, not here — your admin sees those
              directly.
            </Text>
            <Pressable
              onPress={() => router.push('/resident/issues')}
              className="items-center rounded-md border border-paper-200 py-sm dark:border-ink-border"
            >
              <Text className="text-base font-semibold text-brand-800 dark:text-brand-300">
                Go to Issues
              </Text>
            </Pressable>
          </Card>
        )}

        <Card>
          <Text className="mb-xs text-base font-semibold text-paper-900 dark:text-ink-text">
            Contact Nafil Estates
          </Text>
          <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
            App problems, account access, or anything else — reach us directly.
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${email}`)}
            className="items-center rounded-md bg-brand-800 py-sm dark:bg-brand-500"
          >
            <Text className="text-base font-semibold text-white">{email}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}
