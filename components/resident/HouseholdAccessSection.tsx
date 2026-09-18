import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { friendlyDbError } from '../../lib/db-errors';
import { shareHouseholdInvite } from '../../lib/share-household-invite';
import { validateEmail } from '../../lib/validation';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Notice } from '../ui/Notice';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import type {
  HouseholdAccessLevel,
  HouseholdInvite,
  HouseholdLink,
  PublicProfile,
} from '../../types/database';

const LEVELS: { key: HouseholdAccessLevel; label: string; hint: string }[] = [
  {
    key: 'full',
    label: 'Full access',
    hint: 'Their own account with everything a resident has: wallet, marketplace listings, visitor passes, and paying dues for your unit.',
  },
  {
    key: 'visitors_only',
    label: 'Visitors & marketplace',
    hint: 'Can create visitor passes and buy from the marketplace, and has their own ID card. No wallet, dues, issues, or selling.',
  },
];

const LEVEL_LABEL: Record<HouseholdAccessLevel, string> = {
  full: 'Full access',
  visitors_only: 'Visitors & marketplace',
};

/**
 * "Household access": people this resident vouches for to have their own
 * login on the same unit (see 0056_household_access.sql). Separate from
 * "Household & frequent visitors" above it, which is the QR-card feature for
 * recurring visitors who never sign in. Both access levels are listed here
 * together, since this is the one place to see and revoke everyone you've
 * granted access to.
 *
 * Only rendered for a real (admin-approved) resident - a household member
 * can't invite a second layer of members, matching the insert policy.
 */
export function HouseholdAccessSection() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [level, setLevel] = useState<HouseholdAccessLevel>('visitors_only');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<HouseholdInvite | null>(null);
  const [formError, setFormError] = useState<string>();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string>();

  const { data: links } = useQuery({
    queryKey: ['household_links', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_links')
        .select('*')
        .eq('primary_resident_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HouseholdLink[];
    },
    enabled: !!profile,
  });

  const { data: invites } = useQuery({
    queryKey: ['household_invites', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_invites')
        .select('*')
        .eq('resident_id', profile!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HouseholdInvite[];
    },
    enabled: !!profile,
  });

  // profiles_select doesn't let a resident read another resident's row, so
  // member names come from the same narrow RPC the marketplace uses.
  const memberIds = (links ?? []).map((l) => l.member_id);
  const { data: members } = useQuery({
    queryKey: ['household_member_profiles', memberIds],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profiles', { profile_ids: memberIds });
      if (error) throw error;
      return data as PublicProfile[];
    },
    enabled: memberIds.length > 0,
  });
  const memberById = new Map((members ?? []).map((m) => [m.id, m]));

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['household_links', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['household_invites', profile?.id] });
  }

  function reset() {
    setOpen(false);
    setEmail('');
    setEmailError(undefined);
    setLevel('visitors_only');
    setCreated(null);
    setFormError(undefined);
  }

  async function handleCreate() {
    const err = validateEmail(email);
    setEmailError(err);
    setFormError(undefined);
    if (err || !profile?.estate_id) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('household_invites')
      .insert({
        estate_id: profile.estate_id,
        resident_id: profile.id,
        access_level: level,
        email: email.trim(),
      })
      .select()
      .single();
    setCreating(false);

    if (error) {
      setFormError(
        error.code === '23505' ? 'This email already has a pending invite.' : friendlyDbError(error)
      );
      return;
    }
    setCreated(data as HouseholdInvite);
    refresh();
  }

  async function revokeLink(id: string) {
    setListError(undefined);
    setRevokingId(id);
    const { error } = await supabase.rpc('revoke_household_link', { link_id: id });
    setRevokingId(null);
    if (error) return setListError(friendlyDbError(error));
    refresh();
  }

  async function revokeInvite(id: string) {
    setListError(undefined);
    setRevokingId(id);
    const { error } = await supabase.rpc('revoke_household_invite', { invite_id: id });
    setRevokingId(null);
    if (error) return setListError(friendlyDbError(error));
    refresh();
  }

  const activeLinks = (links ?? []).filter((l) => l.status === 'active');
  const revokedLinks = (links ?? []).filter((l) => l.status === 'revoked');

  return (
    <View className="mb-2xl">
      <Text className="mb-xs text-lg font-semibold text-paper-900 dark:text-ink-text">Household access</Text>
      <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
        Give the people you live with their own login on your unit, so they can issue visitor passes when
        you&apos;re away. You&apos;re vouching for them - no estate admin approval is needed, and you can
        remove their access any time.
      </Text>

      {listError && <Notice message={listError} />}

      {!open ? (
        <Button label="Invite someone" variant="secondary" onPress={() => setOpen(true)} className="mb-lg" />
      ) : created ? (
        <Card className="mb-lg">
          <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">Invite created</Text>
          <Text className="mb-md mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
            Share this code with {created.email}. They must sign up with that same email address. It works
            once, for 7 days.
          </Text>
          <View className="mb-md items-center rounded-[8px] bg-paper-50 p-md dark:bg-ink-bg">
            <Text className="text-[24px] font-bold tracking-[2px] text-brand-800 dark:text-brand-300">
              {created.code}
            </Text>
          </View>
          <View className="flex-row gap-sm">
            <Button
              label="Share invite"
              onPress={() => shareHouseholdInvite(created, profile?.full_name)}
              className="flex-1"
            />
            <Button label="Done" variant="secondary" onPress={reset} className="flex-1" />
          </View>
        </Card>
      ) : (
        <Card className="mb-lg">
          {formError && <Notice message={formError} />}

          <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">Access level</Text>
          <View className="mb-lg gap-sm">
            {LEVELS.map((l) => {
              const active = level === l.key;
              return (
                <Pressable
                  key={l.key}
                  onPress={() => setLevel(l.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  className={`rounded-md border p-md active:opacity-80 ${
                    active
                      ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-bg'
                      : 'border-paper-200 dark:border-ink-border'
                  }`}
                >
                  <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{l.label}</Text>
                  <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">{l.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Their email"
            showLabel
            placeholder="name@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError(undefined);
            }}
            error={emailError}
          />
          <Text className="mb-lg text-[12px] leading-[17px] text-paper-500 dark:text-ink-textMuted">
            By inviting them you take responsibility for how they use this access.
          </Text>

          <View className="flex-row gap-sm">
            <Button label="Create invite" onPress={handleCreate} loading={creating} className="flex-1" />
            <Button label="Cancel" variant="secondary" onPress={reset} className="flex-1" />
          </View>
        </Card>
      )}

      {(invites ?? []).map((invite) => (
        <Card key={invite.id}>
          <View className="flex-row items-center gap-md">
            <View className="flex-1">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{invite.email}</Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                {LEVEL_LABEL[invite.access_level]} · code {invite.code}
              </Text>
            </View>
            <StatusBadge label="Invited" tone="warning" />
          </View>
          <Button
            label="Cancel invite"
            variant="ghost"
            loading={revokingId === invite.id}
            onPress={() => revokeInvite(invite.id)}
            className="mt-sm"
          />
        </Card>
      ))}

      {activeLinks.map((link) => {
        const member = memberById.get(link.member_id);
        return (
          <Card key={link.id}>
            <View className="flex-row items-center gap-md">
              <Avatar name={member?.full_name} size={40} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {member?.full_name ?? 'Household member'}
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {LEVEL_LABEL[link.access_level]}
                </Text>
              </View>
              <StatusBadge label="Active" tone="success" />
            </View>
            <Button
              label="Remove access"
              variant="ghost"
              loading={revokingId === link.id}
              onPress={() => revokeLink(link.id)}
              className="mt-sm"
            />
          </Card>
        );
      })}

      {revokedLinks.map((link) => {
        const member = memberById.get(link.member_id);
        return (
          <Card key={link.id}>
            <View className="flex-row items-center gap-md">
              <Avatar name={member?.full_name} size={40} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {member?.full_name ?? 'Household member'}
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {LEVEL_LABEL[link.access_level]}
                </Text>
              </View>
              <StatusBadge label="Removed" tone="neutral" />
            </View>
          </Card>
        );
      })}
    </View>
  );
}
