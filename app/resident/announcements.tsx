import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { AnnouncementsFeed } from '../../components/AnnouncementsFeed';

/** No longer a tab of its own (see `_layout.tsx`) — reached via the floating icon on Issues. */
export default function ResidentAnnouncements() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Announcements</Text>
      </View>
      <AnnouncementsFeed />
    </View>
  );
}
