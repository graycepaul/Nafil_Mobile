import { View, Text, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { AnnouncementsFeed } from '../../components/AnnouncementsFeed';
import { TAB_PROMOTION_BREAKPOINT } from '../../components/ui/tab-options';

/**
 * On a phone-width bottom bar this is reached via the floating icon on
 * Issues (see `_layout.tsx`), pushed onto the stack, hence the back button.
 * At tablet width and up it's promoted to a real tab instead — same screen,
 * just without a back arrow, since there's no "back" from a tab you tapped.
 */
export default function ResidentAnnouncements() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isPromotedTab = Platform.OS === 'web' && width >= TAB_PROMOTION_BREAKPOINT;

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        {!isPromotedTab && (
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
            <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
          </Pressable>
        )}
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Announcements</Text>
      </View>
      <AnnouncementsFeed />
    </View>
  );
}
