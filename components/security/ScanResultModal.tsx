import { View, Text } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { Button } from '../ui/Button';
import { Overlay } from '../ui/Overlay';

export type ScanResult = {
  tone: 'success' | 'error';
  title: string;
  message?: string;
  rows?: { label: string; value: string }[];
};

/**
 * Replaces the old inline Notice banner for scan feedback. That banner sat
 * above a camera that never stopped scanning, so a QR code still in frame
 * re-triggered the same check-in seconds later — a second DB write and a
 * flickering banner. This blocks the camera (scanning only resumes once the
 * guard dismisses it) and gives the guard the actual person's details, not
 * just a pass/fail line.
 */
export function ScanResultModal({ result, onClose }: { result: ScanResult | null; onClose: () => void }) {
  const { colors } = useTheme();

  return (
    <Overlay visible={!!result} onDismiss={onClose}>
      <View className="w-full rounded-lg bg-white p-xl shadow-lg dark:bg-ink-bg">
        {result && (
          <>
            <View
              className={`mb-md h-14 w-14 items-center justify-center self-center rounded-full ${
                result.tone === 'success'
                  ? 'bg-success-muted dark:bg-success-mutedDark'
                  : 'bg-danger-muted dark:bg-danger-mutedDark'
              }`}
            >
              <Ionicons
                name={result.tone === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={30}
                color={result.tone === 'success' ? colors.success : colors.danger}
              />
            </View>

            <Text className="text-center text-lg font-semibold text-paper-900 dark:text-ink-text">
              {result.title}
            </Text>
            {result.message && (
              <Text className="mt-xs text-center text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
                {result.message}
              </Text>
            )}

            {result.rows && result.rows.length > 0 && (
              <View className="mt-lg gap-sm rounded-md bg-paper-50 p-md dark:bg-ink-surface">
                {result.rows.map((row) => (
                  <View key={row.label} className="flex-row justify-between">
                    <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">{row.label}</Text>
                    <Text className="text-[13px] font-medium text-paper-900 dark:text-ink-text">{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

            <Button label="Continue scanning" onPress={onClose} className="mt-xl" />
          </>
        )}
      </View>
    </Overlay>
  );
}
