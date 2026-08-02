import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme-context';
import { AuthShell, AuthLink } from '../../components/auth/AuthShell';
import { OrDivider, GoogleAuthButton } from '../../components/auth/SocialAuthRow';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { authErrorMessage } from '../../lib/auth-errors';
import { validateEmail } from '../../lib/validation';

export default function LoginScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const nextErrors = {
      email: validateEmail(email),
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    // On success the root layout picks up the session and redirects by role.
    if (error) setFormError(authErrorMessage(error));
  }

  return (
    <AuthShell
      title="Login to your Account"
      footer={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.xs + 2,
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Don’t have an account?
          </Text>
          <AuthLink label="Sign up" onPress={() => router.push('/role-select')} />
        </View>
      }
    >
      {formError && <Notice message={formError} />}

      <Input
        label="Email"
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
        }}
        error={errors.email}
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

      <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <AuthLink label="Forgot password?" onPress={() => router.push('/forgot-password')} />
      </View>

      <OrDivider label="- Or sign in with -" />
      <GoogleAuthButton onError={setFormError} />
    </AuthShell>
  );
}
