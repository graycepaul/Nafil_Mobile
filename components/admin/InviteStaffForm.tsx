import { useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { shareStaffInvite } from '../../lib/share-staff-invite';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Notice } from '../ui/Notice';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { validateEmail } from '../../lib/validation';
import type { StaffInvite } from '../../types/database';

const ROLES: { value: StaffInvite['role']; label: string }[] = [
  { value: 'security', label: 'Security' },
  { value: 'admin', label: 'Admin' },
];

/**
 * Creates a staff invite and hands the admin a code to share — through
 * whatever channel they'd already use to reach a new hire (WhatsApp, SMS,
 * in person), the same way visitor pass codes are shared. No email gets sent
 * automatically; that would need server-side infrastructure (an email
 * provider, a backend endpoint) that isn't wired up yet. This works today.
 *
 * Open/closed state lives in the parent (toggled from the Staff header) so
 * the header button and this form agree on whether it's showing.
 */
export function InviteStaffForm({
  estateName,
  estates,
  onInvited,
  onClose,
}: {
  estateName?: string;
  /** super_admin only — lets them pick which estate the invite belongs to instead of it silently defaulting to their own home estate. */
  estates?: { id: string; name: string }[];
  onInvited?: () => void;
  onClose: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffInvite['role']>('security');
  const [estateId, setEstateId] = useState<string | undefined>(profile?.estate_id ?? undefined);
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<StaffInvite | null>(null);

  const targetEstateId = estates && estates.length > 0 ? estateId : profile?.estate_id;
  const targetEstateName = estates?.find((e) => e.id === targetEstateId)?.name ?? estateName;

  async function handleCreate() {
    const emailError = validateEmail(email);
    setError(emailError);
    setFormError(undefined);
    if (emailError || !targetEstateId) return;

    setCreating(true);
    const { data, error: insertError } = await supabase
      .from('staff_invites')
      .insert({ estate_id: targetEstateId, role, email: email.trim(), invited_by: profile!.id })
      .select()
      .single();
    setCreating(false);

    if (insertError) {
      setFormError(
        insertError.code === '23505'
          ? 'This email already has a pending invite.'
          : insertError.message
      );
      return;
    }
    setCreated(data as StaffInvite);
    onInvited?.();
  }

  if (created) {
    return (
      <Card className="mb-xl">
        <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">Invite created</Text>
        <Text className="mb-md mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
          Share this code with {created.email}. It works once, for 7 days.
        </Text>
        <View className="mb-md items-center rounded-[8px] bg-paper-50 p-md dark:bg-ink-surface">
          <Text className="text-[28px] font-bold tracking-[2px] text-brand-800 dark:text-brand-300">
            {created.code}
          </Text>
        </View>
        <View className="flex-row gap-sm">
          <Button
            label="Share invite"
            onPress={() => shareStaffInvite(created, targetEstateName)}
            className="flex-1"
          />
          <Button label="Done" variant="secondary" onPress={onClose} className="flex-1" />
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-xl">
      <Text className="mb-md text-base font-semibold text-paper-900 dark:text-ink-text">Invite staff</Text>
      {formError && <Notice message={formError} />}

      {estates && estates.length > 1 ? (
        <View className="flex-row gap-sm">
          <Select
            label="Estate"
            showLabel
            value={estateId ?? estates[0].id}
            options={estates.map((e) => ({ value: e.id, label: e.name }))}
            onChange={setEstateId}
            className="flex-1"
          />
          <Select
            label="Role"
            showLabel
            value={role}
            options={ROLES}
            onChange={setRole}
            className="flex-1"
          />
        </View>
      ) : (
        <Select label="Role" showLabel value={role} options={ROLES} onChange={setRole} />
      )}
      <Input
        label="Email"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(undefined);
        }}
        error={error}
      />
      <View className="flex-row gap-sm">
        <Button label="Send invite" onPress={handleCreate} loading={creating} className="flex-1" />
        <Button label="Cancel" variant="secondary" onPress={onClose} className="flex-1" />
      </View>
    </Card>
  );
}
