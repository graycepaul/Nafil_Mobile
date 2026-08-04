import { View, Text } from 'react-native';

type Tone = 'error' | 'success' | 'info';

const TONE_CLASSES: Record<Tone, { box: string; text: string }> = {
  error: {
    box: 'bg-danger-muted dark:bg-danger-mutedDark border-danger',
    text: 'text-danger',
  },
  success: {
    box: 'bg-success-muted dark:bg-success-mutedDark border-success',
    text: 'text-success',
  },
  info: {
    box: 'bg-brand-50 dark:bg-brand-900 border-brand-800 dark:border-brand-300',
    text: 'text-brand-800 dark:text-brand-300',
  },
};

/**
 * Inline form-level feedback. Replaces Alert.alert for auth, which matters
 * because react-native-web doesn't implement Alert — errors raised that way are
 * invisible in the browser.
 */
export function Notice({ tone = 'error', message }: { tone?: Tone; message: string }) {
  const { box, text } = TONE_CLASSES[tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className={`mb-lg rounded-sm border-l-[3px] px-md py-md ${box}`}
    >
      <Text className={`text-[13px] leading-[19px] ${text}`}>{message}</Text>
    </View>
  );
}
