import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getAuthRedirectUrl } from '../../lib/auth-session';
import {
  validateHouseholdInviteCode,
  saveHouseholdInviteProfile,
  type ValidatedHouseholdInvite,
} from '../../lib/household-invite';
import { AuthShell } from '../../components/auth/AuthShell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { PasswordMeter } from '../../components/auth/PasswordMeter';
import { TermsNotice } from '../../components/auth/TermsNotice';
import { authErrorMessage } from '../../lib/auth-errors';
import {
  MIN_PASSWORD_LENGTH,
  validateConfirmation,
  validatePassword,
  validateRequired,
} from '../../lib/validation';

type Step = 'code' | 'profile' | 'password' | 'sent';

/**
 * Where "Invited to a household? Use your invite code" leads - the household
 * counterpart of staff-invite.tsx, same single-screen step machine for the
 * same reason (no account exists until the last step, so nothing before it
 * has a route to catch mid-flow). The invite fixes the estate, unit, and
 * access level, so there's no estate search or admin approval here: the
 * resident who sent the code is the one vouching for this person.
 */
export default function HouseholdInviteScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('code');
  const [formError, setFormError] = useState<string>();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [checkingCode, setCheckingCode] = useState(false);
  const [invite, setInvite] = useState<ValidatedHouseholdInvite | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileErrors, setProfileErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{ password?: string; confirm?: string }>({});
  const [creating, setCreating] = useState(false);

  async function handleVerifyCode() {
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError('Enter the code from your invite.');
      return;
    }
    setCodeError(undefined);
    setFormError(undefined);
    setCheckingCode(true);
    const result = await validateHouseholdInviteCode(trimmed);
    setCheckingCode(false);

    if (!result.valid) {
      setCodeError('That code isn’t valid. Check it and try again, or ask them for a new one.');
      return;
    }
    setInvite(result);
    setStep('profile');
  }

  async function handleProfileContinue() {
    const nextErrors = {
      firstName: validateRequired(firstName, 'first name'),
      lastName: validateRequired(lastName, 'last name'),
      phone: validateRequired(phone, 'phone number'),
    };
    setProfileErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSavingProfile(true);
    const { success, error } = await saveHouseholdInviteProfile({
      code: code.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    });
    setSavingProfile(false);

    if (!success) {
      setFormError(error ?? 'Could not save your details. Please try again.');
      return;
    }
    setStep('password');
  }

  async function handleCreateAccount() {
    const nextErrors = {
      password: validatePassword(password),
      confirm: validateConfirmation(password, confirm),
    };
    setPasswordErrors(nextErrors);
    setFormError(undefined);
    if (nextErrors.password || nextErrors.confirm) return;

    setCreating(true);
    const { error } = await supabase.auth.signUp({
      email: invite!.email!,
      password,
      options: { emailRedirectTo: getAuthRedirectUrl('/') },
    });
    setCreating(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setStep('sent');
  }

  if (step === 'sent') {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We've sent a confirmation link to ${invite?.email}. Click it to finish setting up your account.`}
      >
        <Text className="text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
          Your name and phone are already saved. There&apos;s nothing left to fill in once you
          confirm.
        </Text>
      </AuthShell>
    );
  }

  if (step === 'password') {
    return (
      <AuthShell
        title="Set a password"
        subtitle="You'll use this to sign in from now on."
        onBack={() => setStep('profile')}
      >
        {formError && <Notice message={formError} />}

        <Input
          label="Password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
          textContentType="newPassword"
          passwordToggle
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (passwordErrors.password) setPasswordErrors((e) => ({ ...e, password: undefined }));
          }}
          error={passwordErrors.password}
        />
        {password.length > 0 && !passwordErrors.password && <PasswordMeter password={password} />}

        <Input
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          passwordToggle
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            if (passwordErrors.confirm) setPasswordErrors((e) => ({ ...e, confirm: undefined }));
          }}
          error={passwordErrors.confirm}
          returnKeyType="go"
          onSubmitEditing={handleCreateAccount}
        />

        <Button label="Create account" onPress={handleCreateAccount} loading={creating} />
        <TermsNotice actionLabel="creating your account" />
      </AuthShell>
    );
  }

  if (step === 'profile') {
    const who = invite?.inviterName ? `${invite.inviterName}'s household` : 'a household';
    const level = invite?.accessLevel === 'visitors_only' ? ' with visitor and marketplace access' : '';
    return (
      <AuthShell
        title="Set up your profile"
        subtitle={`Joining ${who}${invite?.estateName ? ` at ${invite.estateName}` : ''}${level}.`}
        onBack={() => setStep('code')}
      >
        {formError && <Notice message={formError} />}

        <Input
          label="First name"
          placeholder="First name"
          value={firstName}
          onChangeText={(v) => {
            setFirstName(v);
            if (profileErrors.firstName) setProfileErrors((e) => ({ ...e, firstName: undefined }));
          }}
          error={profileErrors.firstName}
        />
        <Input
          label="Last name"
          placeholder="Last name"
          value={lastName}
          onChangeText={(v) => {
            setLastName(v);
            if (profileErrors.lastName) setProfileErrors((e) => ({ ...e, lastName: undefined }));
          }}
          error={profileErrors.lastName}
        />
        <Input
          label="Phone number"
          placeholder="Phone number"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            if (profileErrors.phone) setProfileErrors((e) => ({ ...e, phone: undefined }));
          }}
          error={profileErrors.phone}
        />

        <Button label="Continue" onPress={handleProfileContinue} loading={savingProfile} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Enter your invite code"
      subtitle="The resident who invited you sent you a code."
      onBack={() => router.back()}
    >
      {formError && <Notice message={formError} />}

      <Input
        label="Invite code"
        placeholder="e.g. A1B2C3D4E5F6"
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={(v) => {
          setCode(v);
          if (codeError) setCodeError(undefined);
        }}
        error={codeError}
        returnKeyType="go"
        onSubmitEditing={handleVerifyCode}
      />

      <Button label="Verify code" onPress={handleVerifyCode} loading={checkingCode} />
    </AuthShell>
  );
}
