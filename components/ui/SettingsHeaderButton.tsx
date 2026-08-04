import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';

/** Header-right gear icon, used across every role's tab bar to reach Settings. */
export function SettingsHeaderButton() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      className="px-lg"
    >
      <Ionicons name="settings-outline" color={colors.onHeaderBg} size={22} />
    </Pressable>
  );
}
