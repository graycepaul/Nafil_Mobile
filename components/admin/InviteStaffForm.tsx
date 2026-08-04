import { useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { shareStaffInvite } from '../../lib/share-staff-invite';
import { useTheme } from '../../context/theme-context';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Notice } from '../ui/Notice';
import { Card } from '../ui/Card';
import { validateEmail } from '../../lib/validation';
import type { StaffInvite } from '../../types/database';

/**
 * Creates a staff invite and hands the admin a code to share — through
 * whatever channel they'd already use to reach a new hire (WhatsApp, SMS,
 * in person), the same way visitor pass codes are shared. No email gets sent
 * automatically; that would need server-side infrastructure (an email
 * provider, a backend endpoint) that isn't wired up yet. This works today.
 */
export function InviteStaffForm({ estateName }: { estateName?: string }) {
  const { colors, spacing, typography } = useTheme();
  const profile = useAuthStore((s) => s.profile);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<StaffInvite | null>(null);

  function reset() {
    setOpen(false);
    setEmail('');
    setError(undefined);
    setFormError(undefined);
    setCreated(null);
  }

  async function handleCreate() {
    const emailError = validateEmail(email);
    setError(emailError);
    setFormError(undefined);
    if (emailError || !profile?.estate_id) return;

    setCreating(true);
    const { data, error: insertError } = await supabase
      .from('staff_invites')
      .insert({ estate_id: profile.estate_id, role: 'security', email: email.trim(), invited_by: profile.id })
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
  }

  if (!open) {
    return (
      <Button
        label="+ Invite staff"
        variant="secondary"
        onPress={() => setOpen(true)}
        style={{ marginBottom: spacing.xl }}
      />
    );
  }

  if (created) {
    return (
      <Card style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>Invite created</Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }]}>
          Share this code with {created.email}. It works once, for 7 days.
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 8,
            padding: spacing.md,
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Text style={[typography.title, { color: colors.primary, letterSpacing: 2 }]}>
            {created.code}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="Share invite"
            onPress={() => shareStaffInvite(created, estateName)}
            style={{ flex: 1 }}
          />
          <Button label="Done" variant="secondary" onPress={reset} style={{ flex: 1 }} />
        </View>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: spacing.xl }}>
      <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: spacing.md }]}>
        Invite staff
      </Text>
      {formError && <Notice message={formError} />}
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
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Send invite" onPress={handleCreate} loading={creating} style={{ flex: 1 }} />
        <Button label="Cancel" variant="secondary" onPress={reset} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}
