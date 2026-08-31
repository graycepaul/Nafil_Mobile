import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getAuthRedirectUrl } from '../../lib/auth-session';
import {
  validateStaffInviteCode,
  saveStaffInviteProfile,
  type ValidatedInvite,
} from '../../lib/staff-invite';
import { pickAndUploadPendingInviteAvatar } from '../../lib/avatar';
import { AuthShell } from '../../components/auth/AuthShell';
import { Avatar } from '../../components/ui/Avatar';
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
 * Where "I have an invite code" leads. One screen, one internal step machine,
 * rather than separate routes — deliberately. No account exists until the very
 * last step (this project requires email confirmation before a session is
 * issued, confirmed empirically — see migration 0007's notes), so everything
 * collected before then is local component state with nowhere durable to live
 * except the invite row itself. Keeping it one screen means there's no
 * intermediate route the root layout's redirect logic could ever catch this
 * mid-flow on — nothing to exempt, because nothing here is a route change.
 */
export default function StaffInviteScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('code');
  const [formError, setFormError] = useState<string>();

  // code step
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [checkingCode, setCheckingCode] = useState(false);
  const [invite, setInvite] = useState<ValidatedInvite | null>(null);

  // profile step
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // password step
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
    const result = await validateStaffInviteCode(trimmed);
    setCheckingCode(false);

    if (!result.valid) {
      setCodeError('That code isn’t valid. Check it and try again, or ask your admin for a new one.');
      return;
    }
    setInvite(result);
    setStep('profile');
  }

  async function handlePickPhoto() {
    setFormError(undefined);
    setUploading(true);
    const { url, error } = await pickAndUploadPendingInviteAvatar(code.trim().toUpperCase());
    setUploading(false);
    if (error) setFormError(error);
    else if (url) setAvatarUrl(url);
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
    const { success, error } = await saveStaffInviteProfile({
      code: code.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      avatarUrl,
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
        subtitle={`We've sent a confirmation link to ${invite?.email}. Click it to finish setting up your account. You'll land straight in your dashboard.`}
      >
        <Text className="text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
          Your name, phone, and photo are already saved. There&apos;s nothing left to fill in once
          you confirm.
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
    return (
      <AuthShell
        title="Set up your profile"
        subtitle={invite?.estateName ? `Joining ${invite.estateName} as ${invite.role}.` : undefined}
        onBack={() => setStep('code')}
      >
        {formError && <Notice message={formError} />}

        <View className="mb-xl items-center">
          <Avatar uri={avatarUrl} name={`${firstName} ${lastName}`} size={96} />
          <Text
            onPress={uploading ? undefined : handlePickPhoto}
            className="mt-md text-sm font-semibold text-brand-800 dark:text-brand-300"
          >
            {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add a photo'}
          </Text>
        </View>

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
      subtitle="Your estate admin sent this to your email when they added you."
      onBack={() => router.back()}
    >
      {formError && <Notice message={formError} />}

      <Input
        label="Invite code"
        placeholder="e.g. A1B2C3D4"
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
