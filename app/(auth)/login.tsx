import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AuthShell, AuthLink } from '../../components/auth/AuthShell';
import { OrDivider, GoogleAuthButton, AppleAuthButton } from '../../components/auth/SocialAuthRow';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { authErrorMessage } from '../../lib/auth-errors';
import { SOCIAL_AUTH_ENABLED } from '../../constants/auth-config';
import { validateEmail } from '../../lib/validation';
import { looksLikePhone, normalizePhone } from '../../lib/phone';

export default function LoginScreen() {
  const router = useRouter();

  // Email or phone number - dependants invited by a resident have a phone +
  // password account and no email at all (see household-invite.tsx).
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const isPhone = looksLikePhone(identifier);
    const phone = isPhone ? normalizePhone(identifier) : null;
    const nextErrors = {
      identifier: isPhone
        ? phone
          ? undefined
          : 'That phone number doesn’t look right.'
        : validateEmail(identifier)?.replace('your email address', 'your email or phone number'),
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (nextErrors.identifier || nextErrors.password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(
      phone ? { phone, password } : { email: identifier.trim(), password }
    );
    setLoading(false);

    // On success the root layout picks up the session and redirects by role.
    if (error) setFormError(authErrorMessage(error));
  }

  return (
    <AuthShell
      title="Login to your Account"
      footer={
        <View className="flex-row items-center justify-center gap-[6px]">
          <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">
            Don’t have an account?
          </Text>
          <AuthLink label="Sign up" onPress={() => router.push('/role-select')} />
        </View>
      }
    >
      {formError && <Notice message={formError} />}

      <Input
        label="Email or phone number"
        placeholder="Email or phone number"
        autoCapitalize="none"
        autoComplete="username"
        keyboardType="email-address"
        textContentType="username"
        value={identifier}
        onChangeText={(v) => {
          setIdentifier(v);
          if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
        }}
        error={errors.identifier}
        returnKeyType="next"
      />

      <Input
        label="Password"
        placeholder="Password"
        autoComplete="current-password"
        textContentType="password"
        passwordToggle
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        error={errors.password}
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <Button label="Sign in" onPress={handleLogin} loading={loading} />

      <View className="mt-lg items-center">
        <AuthLink label="Forgot password?" onPress={() => router.push('/forgot-password')} />
      </View>

      {SOCIAL_AUTH_ENABLED && (
        <>
          <OrDivider label="- Or sign in with -" />
          <View className="gap-md">
            <AppleAuthButton onError={setFormError} />
            <GoogleAuthButton onError={setFormError} />
          </View>
        </>
      )}
    </AuthShell>
  );
}
