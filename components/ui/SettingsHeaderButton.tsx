import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { GearIcon } from './icons';

/** Header-right gear icon, used across every role's tab bar to reach Settings. */
export function SettingsHeaderButton() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      style={{ paddingHorizontal: spacing.lg }}
    >
      <GearIcon color={colors.onHeaderBg} size={22} />
    </Pressable>
  );
}
