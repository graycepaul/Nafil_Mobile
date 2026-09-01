import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';

/** Profile tab's header-right row: wallet, then settings. */
export function ProfileHeaderActions() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-md pr-lg">
      <Pressable
        onPress={() => router.push('/resident/wallet')}
        accessibilityRole="button"
        accessibilityLabel="Wallet"
        hitSlop={8}
      >
        <Ionicons name="wallet-outline" size={20} color={colors.onHeaderBg} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
      >
        <Ionicons name="settings-outline" size={20} color={colors.onHeaderBg} />
      </Pressable>
    </View>
  );
}
