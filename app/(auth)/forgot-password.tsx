import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AuthShell } from '../../components/auth/AuthShell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { authErrorMessage } from '../../lib/auth-errors';
import { getAuthRedirectUrl } from '../../lib/auth-session';
import { validateEmail } from '../../lib/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const emailError = validateEmail(email);
    setError(emailError);
    setFormError(undefined);
    if (emailError) return;

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl('/set-password'),
    });
    setLoading(false);

    // Deliberately route to the confirmation screen even on most failures below —
    // see the note in check-email.tsx about not leaking which emails are registered.
    if (resetError) {
      setFormError(authErrorMessage(resetError));
      return;
    }
    router.replace({ pathname: '/check-email', params: { email: email.trim(), mode: 'reset' } });
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we’ll send you a link to set a new password."
      onBack={() => router.back()}
    >
      {formError && <Notice message={formError} />}

      <Input
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(undefined);
        }}
        error={error}
        returnKeyType="go"
        onSubmitEditing={handleReset}
      />

      <Button label="Send reset link" onPress={handleReset} loading={loading} />
    </AuthShell>
  );
}
