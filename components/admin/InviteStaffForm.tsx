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

const BASE_ROLES: { value: StaffInvite['role']; label: string }[] = [
  { value: 'security', label: 'Security' },
  { value: 'admin', label: 'Admin' },
];

// Finance sees only market listings and money matters (transfers, dues) —
// a narrower role than admin, so only super_admin can hand it out (the
// server enforces this too: staff_invites_insert rejects a finance-role
// invite from anyone but super_admin).
const FINANCE_ROLE = { value: 'finance' as const, label: 'Finance' };

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
  onInvited,
  onClose,
}: {
  estateName?: string;
  onInvited?: () => void;
  onClose: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const isSuperAdmin = profile?.role === 'super_admin';
  const ROLES = isSuperAdmin ? [...BASE_ROLES, FINANCE_ROLE] : BASE_ROLES;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffInvite['role']>('security');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<StaffInvite | null>(null);

  // Every role (including super_admin, now scoped to their own estate) can
  // only ever invite into their own estate — staff_invites_insert's RLS
  // check enforces the same thing server-side.
  const targetEstateId = profile?.estate_id;
  const targetEstateName = estateName;

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

      <Select label="Role" showLabel value={role} options={ROLES} onChange={setRole} />
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
