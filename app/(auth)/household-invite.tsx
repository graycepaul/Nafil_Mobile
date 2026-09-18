import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  validateHouseholdInviteCode,
  saveHouseholdInviteProfile,
  acceptHouseholdInvite,
  type ValidatedHouseholdInvite,
} from '../../lib/household-invite';
import { formatPhoneForDisplay, normalizePhone } from '../../lib/phone';
import { useAuthStore } from '../../store/auth-store';
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

type Step = 'code' | 'profile' | 'password';

/**
 * Where "Invited to a household? Use your invite code" leads - the household
 * counterpart of staff-invite.tsx, same single-screen step machine (no
 * account exists until the last step, so nothing before it has a route to
 * catch mid-flow).
 *
 * The invite fixes the estate, unit, access level and phone number, so
 * there's no estate search, no admin approval, and nothing to type but a
 * name and a password: the resident who sent the code is the one vouching
 * for this person. The account is a phone + password account, created and
 * linked in one go - the auth server auto-confirms sign-ups, so there's no
 * confirmation message to wait for. This route is exempt from the root
 * layout's "unapproved resident -> onboarding" redirect (see
 * AUTH_GROUP_EXCEPTIONS) so it isn't yanked away between the account being
 * created and the invite being linked a moment later.
 */
export default function HouseholdInviteScreen() {
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [step, setStep] = useState<Step>('code');
  const [formError, setFormError] = useState<string>();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [checkingCode, setCheckingCode] = useState(false);
  const [invite, setInvite] = useState<ValidatedHouseholdInvite | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileErrors, setProfileErrors] = useState<{ firstName?: string; lastName?: string }>({});
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
    // Prefill from the name the resident gave when inviting - a starting
    // point the dependant can change, since it's their own profile name.
    if (result.inviteeName && !firstName && !lastName) {
      const parts = result.inviteeName.trim().split(/\s+/);
      setLastName(parts.length > 1 ? parts[parts.length - 1] : '');
      setFirstName(parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0]);
    }
    setStep('profile');
  }

  async function handleProfileContinue() {
    const nextErrors = {
      firstName: validateRequired(firstName, 'first name'),
      lastName: validateRequired(lastName, 'last name'),
    };
    setProfileErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSavingProfile(true);
    const { success, error } = await saveHouseholdInviteProfile({
      code: code.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
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

    const phone = normalizePhone(invite!.phone!);
    if (!phone) {
      setFormError('This invite has an invalid phone number. Ask them for a new one.');
      return;
    }

    setCreating(true);
    const signUp = await supabase.auth.signUp({
      phone,
      password,
      options: { data: { full_name: `${firstName.trim()} ${lastName.trim()}`.trim() } },
    });

    if (signUp.error || !signUp.data.session) {
      // Most likely an earlier attempt already created this account but never
      // finished linking it (e.g. a dropped connection) - sign in with the
      // same credentials and carry on rather than dead-ending.
      const signIn = await supabase.auth.signInWithPassword({ phone, password });
      if (signIn.error) {
        setCreating(false);
        setFormError(authErrorMessage(signUp.error ?? signIn.error));
        return;
      }
    }

    const { accepted } = await acceptHouseholdInvite(code.trim());
    if (!accepted) {
      setCreating(false);
      setFormError(
        'Your account was created but we couldn’t link it to the household. Try again, or ask for a new invite code.'
      );
      return;
    }

    await refreshProfile();
    setCreating(false);
    router.replace('/resident' as never);
  }

  if (step === 'password') {
    return (
      <AuthShell
        title="Set a password"
        subtitle={`You'll sign in with ${formatPhoneForDisplay(invite?.phone)} and this password.`}
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
    const level = invite?.accessLevel === 'visitors_only' ? ' with limited access' : ' with full access';
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
        <Text className="mb-lg text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
          Your account will use the phone number you were invited with:{' '}
          {formatPhoneForDisplay(invite?.phone)}.
        </Text>

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
