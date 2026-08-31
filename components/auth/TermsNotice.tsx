import { Text, Linking } from 'react-native';

/** Consent line shown wherever an account actually gets created — not on every login, since existing users already agreed once. */
export function TermsNotice({ actionLabel = 'signing up' }: { actionLabel?: string }) {
  return (
    <Text className="mt-md text-center text-[12px] leading-[17px] text-paper-500 dark:text-ink-textMuted">
      By {actionLabel}, you agree to our{' '}
      <Text
        onPress={() => Linking.openURL('https://nafilestates.com/terms')}
        className="font-semibold text-brand-800 dark:text-brand-300"
      >
        Terms of Service
      </Text>{' '}
      and{' '}
      <Text
        onPress={() => Linking.openURL('https://nafilestates.com/privacy')}
        className="font-semibold text-brand-800 dark:text-brand-300"
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}
