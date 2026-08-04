import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/theme-context';
import { GoogleIcon } from './SocialIcons';
import { signInWithGoogle } from '../../lib/oauth';
import { authErrorMessage } from '../../lib/auth-errors';
import { GOOGLE_OAUTH_ENABLED } from '../../constants/auth-config';

export function OrDivider({ label }: { label: string }) {
  return (
    <View className="my-xl flex-row items-center gap-md">
      <View className="h-px flex-1 bg-paper-200 dark:bg-ink-border" />
      <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">{label}</Text>
      <View className="h-px flex-1 bg-paper-200 dark:bg-ink-border" />
    </View>
  );
}

/** Full-width "Continue with Google" button — the only OAuth provider this app offers. */
export function GoogleAuthButton({ onError }: { onError: (message: string) => void }) {
  const { colors } = useTheme();
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
      className="h-[54px] flex-row items-center justify-center gap-[10px] rounded-md border border-paper-200 bg-white shadow-sm active:opacity-70 dark:border-ink-border dark:bg-ink-surface"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <>
          <GoogleIcon />
          <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}
