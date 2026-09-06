import { View, Text, Linking, Platform } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/theme-context';
import { Button } from './ui/Button';

interface UpdateRequiredScreenProps {
  message: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
}

/**
 * Replaces the entire app (rendered instead of <Slot/> in app/_layout.tsx,
 * not as an overlay on top of it) — this version is old enough that nothing
 * behind it can be trusted to work correctly against the current backend,
 * so there's deliberately no dismiss/skip here, unlike UpdateAvailableModal.
 */
export function UpdateRequiredScreen({ message, iosStoreUrl, androidStoreUrl }: UpdateRequiredScreenProps) {
  const { colors } = useTheme();
  const storeUrl = Platform.OS === 'ios' ? iosStoreUrl : androidStoreUrl;

  return (
    <View className="flex-1 items-center justify-center bg-white p-xl dark:bg-ink-bg">
      <View className="mb-lg h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900">
        <Ionicons name="arrow-up-circle" size={34} color={colors.primary} />
      </View>
      <Text className="text-center text-xl font-bold text-paper-900 dark:text-ink-text">
        Update required
      </Text>
      <Text className="mt-sm text-center text-[14px] leading-[20px] text-paper-500 dark:text-ink-textMuted">
        {message || 'This version of Nafil Estates is no longer supported. Update to keep using the app.'}
      </Text>
      {storeUrl && (
        <Button
          label="Update now"
          onPress={() => Linking.openURL(storeUrl)}
          className="mt-xl w-full"
        />
      )}
    </View>
  );
}
