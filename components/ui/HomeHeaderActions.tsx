import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { BellIcon, LifeBuoyIcon, GearIcon } from './icons';

/** Home tab's header-right row: notifications, support, settings — the only tab that gets all three. */
export function HomeHeaderActions() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-md pr-lg">
      <Pressable
        onPress={() => router.push('/resident/announcements')}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={8}
      >
        <BellIcon color={colors.onHeaderBg} size={22} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/support')}
        accessibilityRole="button"
        accessibilityLabel="Support"
        hitSlop={8}
      >
        <LifeBuoyIcon color={colors.onHeaderBg} size={22} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
      >
        <GearIcon color={colors.onHeaderBg} size={22} />
      </Pressable>
    </View>
  );
}
