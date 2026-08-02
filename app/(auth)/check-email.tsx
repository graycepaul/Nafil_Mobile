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
  const { colors, spacing, typography, radius } = useTheme();
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
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.primaryMuted,
          borderRadius: radius.lg,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <EnvelopeIcon color={colors.primary} />
        {email && (
          <Text
            style={[
              typography.bodyStrong,
              { color: colors.text, marginTop: spacing.md, textAlign: 'center' },
            ]}
          >
            {email}
          </Text>
        )}
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              marginTop: spacing.sm,
              textAlign: 'center',
              lineHeight: 19,
            },
          ]}
        >
          The link expires in 60 minutes. Check your spam folder if it hasn’t arrived
          within a few minutes.
        </Text>
      </View>

      {error && <Notice message={error} />}
      {resent && !error && (
        <Notice tone="success" message="Sent again — check your inbox." />
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
