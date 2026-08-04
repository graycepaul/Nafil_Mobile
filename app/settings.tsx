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
  const { colors, spacing, radius, typography, elevation, mode, setMode } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.headerBg,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing['2xl'],
          paddingBottom: spacing.lg,
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ArrowLeftIcon color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text style={[typography.heading, { color: colors.onHeaderBg }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>
          APPEARANCE
        </Text>
        <Card style={{ padding: spacing.xs }}>
          {THEME_OPTIONS.map((option, index) => {
            const active = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setMode(option.mode)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={[typography.body, { color: colors.text }]}>{option.label}</Text>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: radius.full,
                    borderWidth: 1.5,
                    borderColor: active ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active && (
                    <View
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: radius.full,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </Card>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl }]}>
          System follows your device's light/dark setting automatically.
        </Text>

        <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>
          ACCOUNT
        </Text>
        <Card style={{ alignItems: 'flex-start', ...elevation.card }}>
          <SignOutButton />
        </Card>
      </ScrollView>
    </View>
  );
}
