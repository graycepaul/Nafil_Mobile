import { useState } from 'react';
import { Text } from 'react-native';
import { useAuthStore } from '../store/auth-store';
import { AuthShell } from './auth/AuthShell';
import { Button } from './ui/Button';

/** Shown when the user is signed in but their profile could not be loaded (usually a connection problem), instead of an endless splash. */
export function ProfileLoadError() {
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    await refreshProfile();
    setRetrying(false);
  }

  return (
    <AuthShell title="Couldn't load your account" subtitle="Check your connection and try again.">
      <Text className="mb-xl text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
        You&apos;re still signed in. Nothing has been lost.
      </Text>
      <Button label="Try again" onPress={retry} loading={retrying} />
      <Button label="Sign out" variant="secondary" onPress={signOut} className="mt-md" />
    </AuthShell>
  );
}
