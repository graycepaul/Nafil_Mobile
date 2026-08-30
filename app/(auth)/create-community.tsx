import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AuthShell, AuthLink } from '../../components/auth/AuthShell';
import { TermsNotice } from '../../components/auth/TermsNotice';
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

/**
 * Onboards a brand-new estate, not a person joining one — the third fork off
 * role-select, next to resident and staff. There's no admin to approve this
 * signup against because this account IS that estate's first admin; the
 * community name travels in the same `raw_user_meta_data` signup payload
 * full_name already uses, and `private.handle_new_user()` reads it to create
 * the estate and grant admin access in one trigger. See that migration for
 * why this doesn't need its own endpoint.
 */
export default function CreateCommunityScreen() {
  const router = useRouter();

  const [communityName, setCommunityName] = useState('');
  const [communityAddress, setCommunityAddress] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  async function handleSubmit() {
    const nextErrors = {
      communityName: validateRequired(communityName, 'community name'),
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
      options: {
        data: {
          full_name: fullName.trim(),
          community_name: communityName.trim(),
          community_address: communityAddress.trim() || null,
        },
      },
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
      title="Register your community"
      subtitle="You'll be the estate's first admin — set up its record, then invite your team."
      onBack={() => router.back()}
      footer={
        <View className="flex-row items-center justify-center gap-[6px]">
          <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">
            Already have an account?
          </Text>
          <AuthLink label="Sign in" onPress={() => router.replace('/login')} />
        </View>
      }
    >
      {formError && <Notice message={formError} />}

      <Input
        label="Community name"
        placeholder="e.g. Nafil Gardens"
        autoCapitalize="words"
        value={communityName}
        onChangeText={(v) => {
          setCommunityName(v);
          clear('communityName');
        }}
        error={errors.communityName}
      />

      <Input
        label="Address (optional)"
        placeholder="Street address"
        value={communityAddress}
        onChangeText={setCommunityAddress}
      />

      <Input
        label="Your full name"
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

      <Button label="Register community" onPress={handleSubmit} loading={loading} />
      <TermsNotice actionLabel="registering" />
    </AuthShell>
  );
}
