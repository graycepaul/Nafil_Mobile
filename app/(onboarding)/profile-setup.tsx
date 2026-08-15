import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { pickAndUploadAvatar } from '../../lib/avatar';
import { useAuthStore } from '../../store/auth-store';
import { AuthShell } from '../../components/auth/AuthShell';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';

/**
 * First onboarding step: the details that live on the resident regardless of
 * which estate they end up in. Phone is required (it's how a guard or admin
 * reaches a resident about a visitor or issue); the photo is optional — skip
 * is always available, and initials cover the empty state everywhere an
 * avatar renders.
 */
export default function ProfileSetupScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [phoneError, setPhoneError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePickPhoto() {
    if (!profile) return;
    setFormError(undefined);
    setUploading(true);
    const { url, error } = await pickAndUploadAvatar(profile.id);
    setUploading(false);
    if (error) setFormError(error);
    else if (url) setAvatarUrl(url);
  }

  async function handleContinue() {
    if (!profile) return;
    const trimmed = phone.trim();
    if (!trimmed) {
      setPhoneError('Enter a phone number: it’s how the gate or your admin reaches you.');
      return;
    }
    setPhoneError(undefined);
    setFormError(undefined);
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ phone: trimmed, avatar_url: avatarUrl })
      .eq('id', profile.id);

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    await refreshProfile();
    router.replace('/onboarding');
  }

  return (
    <AuthShell
      title="Set up your profile"
      subtitle="A couple of details before we get you into your estate."
    >
      {formError && <Notice message={formError} />}

      <View className="mb-xl items-center">
        <Avatar uri={avatarUrl} name={profile?.full_name} size={96} />
        <Pressable
          onPress={handlePickPhoto}
          disabled={uploading}
          accessibilityRole="button"
          className="mt-md active:opacity-60"
        >
          <Text className="text-sm font-semibold text-brand-800 dark:text-brand-300">
            {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add a photo'}
          </Text>
        </Pressable>
      </View>

      <Input
        label="Phone number"
        placeholder="Phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          if (phoneError) setPhoneError(undefined);
        }}
        error={phoneError}
      />

      <Button label="Continue" onPress={handleContinue} loading={saving} />
    </AuthShell>
  );
}
