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
import { PasswordMeter } from '../../components/auth/PasswordMeter';
import { authErrorMessage } from '../../lib/auth-errors';
import {
  validateConfirmation,
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../lib/validation';

export default function SignupScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  async function handleSignup() {
    const nextErrors = {
      fullName: validateRequired(fullName, 'full name'),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmation(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace({ pathname: '/check-email', params: { email: email.trim() } });
  }

  return (
    <AuthShell
      title="Create your Account"
      subtitle="Signing up as a resident"
      onBack={() => router.back()}
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
            Already have an account?
          </Text>
          <AuthLink label="Sign in" onPress={() => router.replace('/login')} />
        </View>
      }
    >
      {formError && <Notice message={formError} />}

      <Input
        label="Full name"
        placeholder="Full name"
        autoComplete="name"
        textContentType="name"
        value={fullName}
        onChangeText={(v) => {
          setFullName(v);
          clear('fullName');
        }}
        error={errors.fullName}
      />

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
          clear('email');
        }}
        error={errors.email}
      />

      <Input
        label="Password"
        placeholder="Password"
        autoComplete="new-password"
        textContentType="newPassword"
        passwordToggle
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clear('password');
        }}
        error={errors.password}
      />
      {password.length > 0 && !errors.password && <PasswordMeter password={password} />}

      <Input
        label="Confirm password"
        placeholder="Confirm Password"
        autoComplete="new-password"
        passwordToggle
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          clear('confirm');
        }}
        error={errors.confirm}
      />

      <Button label="Sign up" onPress={handleSignup} loading={loading} />

      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: spacing.lg,
            lineHeight: 18,
          },
        ]}
      >
        An estate admin approves new accounts against the unit register before access is
        granted.
      </Text>

      <OrDivider label="- Or sign up with -" />
      <GoogleAuthButton onError={setFormError} />
    </AuthShell>
  );
}
