import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/theme-context';
import { GoogleIcon } from './SocialIcons';
import { signInWithGoogle } from '../../lib/oauth';
import { authErrorMessage } from '../../lib/auth-errors';
import { GOOGLE_OAUTH_ENABLED } from '../../constants/auth-config';

export function OrDivider({ label }: { label: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginVertical: spacing.xl,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

/** Full-width "Continue with Google" button — the only OAuth provider this app offers. */
export function GoogleAuthButton({ onError }: { onError: (message: string) => void }) {
  const { colors, spacing, radius, typography, elevation } = useTheme();
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    // Checked before we navigate: an unconfigured provider would otherwise land
    // the user on Supabase's raw JSON error page with no way back.
    if (!GOOGLE_OAUTH_ENABLED) {
      onError('Google sign-in isn’t set up yet. Use your email and password for now.');
      return;
    }

    setLoading(true);
    const { error, cancelled } = await signInWithGoogle();
    setLoading(false);
    if (cancelled) return; // user backed out; not worth an error message
    if (error) onError(authErrorMessage(error) ?? 'Sign-in failed.');
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm + 2,
          height: 54,
          backgroundColor: colors.inputBg,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          opacity: pressed ? 0.7 : 1,
        },
        elevation.input,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <>
          <GoogleIcon />
          <Text style={[typography.bodyStrong, { color: colors.text }]}>
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}
