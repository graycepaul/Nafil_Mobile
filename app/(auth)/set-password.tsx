import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AuthShell, AuthLink } from '../../components/auth/AuthShell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { PasswordMeter } from '../../components/auth/PasswordMeter';
import { authErrorMessage } from '../../lib/auth-errors';
import { validateConfirmation, validatePassword } from '../../lib/validation';

type LinkStatus = 'checking' | 'ready' | 'invalid';

/**
 * Where a password-reset or staff-invite email link lands.
 *
 * Both cases are the same UI: Supabase hands the browser/app a valid session from
 * the link (via `detectSessionInUrl` on web, or `establishSessionFromUrl` on native
 * — see `_layout.tsx`), and this screen just needs the user to set a password
 * before continuing. We don't currently distinguish "reset" from "invite" in copy;
 * the action is identical either way.
 *
 * The root layout carves out an exception for this route so an authenticated
 * session doesn't immediately bounce the user to their role home before they've
 * had a chance to set a password.
 */
export default function SetPasswordScreen() {
  const router = useRouter();

  const [status, setStatus] = useState<LinkStatus>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let settled = false;

    function markReady() {
      if (!settled) {
        settled = true;
        setStatus('ready');
      }
    }

    // Covers native: `_layout.tsx` already established the session by the time
    // this screen mounts, so it's usually sitting here already.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    // Covers web: `detectSessionInUrl` resolves asynchronously after the client
    // is created, so the session may not exist yet on the first check above.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) markReady();
    });

    // Neither fired in time: the link is expired, already used, or someone
    // navigated here directly. Give up rather than show a form with nothing to submit.
    const timeout = setTimeout(() => {
      if (!settled) setStatus('invalid');
    }, 3500);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit() {
    const nextErrors = {
      password: validatePassword(password),
      confirm: validateConfirmation(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (nextErrors.password || nextErrors.confirm) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setDone(true);
  }

  if (status === 'checking') {
    return (
      <AuthShell title="Checking your link…">
        <Text className="text-base text-paper-500 dark:text-ink-textMuted">
          One moment, confirming this link is still valid.
        </Text>
      </AuthShell>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthShell
        title="This link has expired"
        subtitle="Password reset and invite links only work once, and expire after a while. Request a new one to continue."
        footer={<AuthLink label="Back to sign in" onPress={() => router.replace('/login')} />}
      >
        <Button
          label="Request a new link"
          onPress={() => router.replace('/forgot-password')}
        />
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Password set"
        subtitle="You're all set. Continue into your account."
      >
        <Button label="Continue" onPress={() => router.replace('/')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set your password" subtitle="Choose a password for your account.">
      {formError && <Notice message={formError} />}

      <Input
        label="New password"
        placeholder="New password"
        autoComplete="new-password"
        textContentType="newPassword"
        passwordToggle
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        error={errors.password}
      />
      {password.length > 0 && !errors.password && <PasswordMeter password={password} />}

      <Input
        label="Confirm password"
        placeholder="Confirm password"
        autoComplete="new-password"
        passwordToggle
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
        }}
        error={errors.confirm}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <Button label="Set password" onPress={handleSubmit} loading={loading} />

      <View className="mt-lg">
        <Text className="text-[13px] leading-[18px] text-paper-500 dark:text-ink-textMuted">
          This link can only be used once.
        </Text>
      </View>
    </AuthShell>
  );
}
