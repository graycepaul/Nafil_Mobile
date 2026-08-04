import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme-context';
import type { ThemeMode } from '../store/theme-store';
import { Card } from '../components/ui/Card';
import { SignOutButton } from '../components/SignOutButton';
import { ArrowLeftIcon } from '../components/ui/icons';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

/**
 * Shared across every role — there's nothing resident/security/admin-specific
 * about theme or signing out, so this lives outside the role-scoped tab
 * groups rather than being duplicated three times. Reached via the gear icon
 * in each role's tab header.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View className="flex-row items-center gap-md bg-white px-lg pb-lg pt-2xl dark:bg-ink-bg">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ArrowLeftIcon color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Settings</Text>
      </View>

      <ScrollView contentContainerClassName="p-xl">
        <Text className="mb-sm text-sm font-medium text-paper-500 dark:text-ink-textMuted">
          APPEARANCE
        </Text>
        <Card className="p-xs">
          {THEME_OPTIONS.map((option, index) => {
            const active = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setMode(option.mode)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`flex-row items-center justify-between px-md py-md ${
                  index === 0 ? '' : 'border-t border-paper-200 dark:border-ink-border'
                }`}
              >
                <Text className="text-base text-paper-900 dark:text-ink-text">{option.label}</Text>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
                    active ? 'border-brand-800 dark:border-brand-300' : 'border-paper-200 dark:border-ink-border'
                  }`}
                >
                  {active && <View className="h-[11px] w-[11px] rounded-full bg-brand-800 dark:bg-brand-300" />}
                </View>
              </Pressable>
            );
          })}
        </Card>
        <Text className="mb-xl mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
          System follows your device's light/dark setting automatically.
        </Text>

        <Text className="mb-sm text-sm font-medium text-paper-500 dark:text-ink-textMuted">
          ACCOUNT
        </Text>
        <Card className="items-start shadow-sm">
          <SignOutButton />
        </Card>
      </ScrollView>
    </View>
  );
}
