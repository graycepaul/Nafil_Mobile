import { useState } from 'react';
import { View, Text, Linking, Platform } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/theme-context';
import { Overlay } from './ui/Overlay';
import { Button } from './ui/Button';

interface UpdateAvailableModalProps {
  message: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
}

/**
 * A newer version exists but this one still works fine against the current
 * backend - dismissible, shown once per app open rather than every time a
 * query happens to remount this. Unlike UpdateRequiredScreen, this renders
 * as an overlay on top of the normal app, not in place of it.
 */
export function UpdateAvailableModal({ message, iosStoreUrl, androidStoreUrl }: UpdateAvailableModalProps) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const storeUrl = Platform.OS === 'ios' ? iosStoreUrl : androidStoreUrl;

  return (
    <Overlay visible={!dismissed} onDismiss={() => setDismissed(true)}>
      <View className="w-full rounded-lg bg-white p-xl shadow-lg dark:bg-ink-bg">
        <View className="mb-md flex-row items-center gap-sm">
          <Ionicons name="arrow-up-circle-outline" size={20} color={colors.primary} />
          <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
            Update available
          </Text>
        </View>
        <Text className="text-[14px] leading-[20px] text-paper-500 dark:text-ink-textMuted">
          {message || 'A newer version of Nafil Estates is available.'}
        </Text>
        <View className="mt-xl flex-row gap-sm">
          <Button label="Later" variant="secondary" onPress={() => setDismissed(true)} className="flex-1" />
          {storeUrl && (
            <Button
              label="Update"
              onPress={() => {
                setDismissed(true);
                Linking.openURL(storeUrl);
              }}
              className="flex-1"
            />
          )}
        </View>
      </View>
    </Overlay>
  );
}
