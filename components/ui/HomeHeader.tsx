import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/theme-context';
import { BrandLockup } from './BrandMark';
import { HomeHeaderActions } from './HomeHeaderActions';

/**
 * Resident home tab's full header, as one component rather than native
 * headerTitle + headerRight split — that split gave the right side (icons)
 * padding control but left the lockup on the left with whatever the
 * navigator's default inset was. Rendering both sides in a single row lets
 * one `px-lg` apply evenly to both edges.
 */
export function HomeHeader() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View className="h-14 flex-row items-center justify-between px-lg">
        <BrandLockup size="sm" />
        <HomeHeaderActions />
      </View>
    </View>
  );
}
