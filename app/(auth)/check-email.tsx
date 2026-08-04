import { useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme-context';
import { AuthShell, AuthLink } from '../../components/auth/AuthShell';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { EnvelopeIcon } from '../../components/auth/RoleIcons';
import { authErrorMessage } from '../../lib/auth-errors';

export default function CheckEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { email, mode } = useLocalSearchParams<{ email?: string; mode?: string }>();

  const isReset = mode === 'reset';
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function resend() {
    if (!email) return;
    setLoading(true);
    setError(undefined);

    const { error: resendError } = isReset
      ? await supabase.auth.resetPasswordForEmail(email)
      : await supabase.auth.resend({ type: 'signup', email });

    setLoading(false);
    if (resendError) setError(authErrorMessage(resendError));
    else setResent(true);
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        isReset
          ? 'If that address has an account, a password reset link is on its way.'
          : 'We’ve sent a confirmation link to verify your address.'
      }
      footer={<AuthLink label="Back to sign in" onPress={() => router.replace('/login')} />}
    >
      <View className="mb-xl items-center rounded-lg bg-brand-50 px-lg py-xl dark:bg-brand-900">
        <EnvelopeIcon color={colors.primary} />
        {email && (
          <Text className="mt-md text-center text-base font-semibold text-paper-900 dark:text-ink-text">
            {email}
          </Text>
        )}
        <Text className="mt-sm text-center text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
          The link expires in 60 minutes. Check your spam folder if it hasn’t arrived
          within a few minutes.
        </Text>
      </View>

      {error && <Notice message={error} />}
      {resent && !error && (
        <Notice tone="success" message="Sent again. Check your inbox." />
      )}

      <Button
        label={resent ? 'Resend again' : 'Resend email'}
        variant="secondary"
        onPress={resend}
        loading={loading}
        disabled={!email}
      />
    </AuthShell>
  );
}
