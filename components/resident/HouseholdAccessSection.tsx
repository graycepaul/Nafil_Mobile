import { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { friendlyDbError } from '../../lib/db-errors';
import { shareHouseholdInvite } from '../../lib/share-household-invite';
import { validatePhone, validateRequired } from '../../lib/validation';
import { normalizePhone, formatPhoneForDisplay } from '../../lib/phone';
import { pickVisitorPhone } from '../../lib/contacts';
import { useTheme } from '../../context/theme-context';
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

const LEVELS: { key: HouseholdAccessLevel; label: string; hint?: string; points?: string[] }[] = [
  {
    key: 'full',
    label: 'Full access',
    hint: 'Gains full access to all features available to residents.',
  },
  {
    key: 'visitors_only',
    label: 'Limited access',
    points: ['Generate visitor passes', 'Buy from the marketplace', 'Gets their personal ID card'],
  },
];

const LEVEL_LABEL: Record<HouseholdAccessLevel, string> = {
  full: 'Full access',
  visitors_only: 'Limited access',
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
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
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
    setName('');
    setNameError(undefined);
    setPhone('');
    setPhoneError(undefined);
    setLevel('visitors_only');
    setCreated(null);
    setFormError(undefined);
  }

  async function handlePickContact() {
    setFormError(undefined);
    const { phone: picked, error } = await pickVisitorPhone();
    if (error) return setFormError(error);
    if (picked) {
      setPhone(picked);
      setPhoneError(undefined);
    }
  }

  async function handleCreate() {
    const normalized = normalizePhone(phone);
    const err = validatePhone(phone) ?? (normalized ? undefined : 'Enter a valid phone number.');
    const nameErr = validateRequired(name, 'their name');
    setPhoneError(err);
    setNameError(nameErr);
    setFormError(undefined);
    if (err || nameErr || !normalized || !profile?.estate_id) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('household_invites')
      .insert({
        estate_id: profile.estate_id,
        resident_id: profile.id,
        access_level: level,
        invitee_name: name.trim(),
        phone: normalized,
      })
      .select()
      .single();
    setCreating(false);

    if (error) {
      setFormError(
        error.code === '23505'
          ? 'This number already has a pending invite. Cancel it first to send a new one.'
          : friendlyDbError(error)
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
        Give a spouse, child or other dependant their own login on your unit, so they can issue visitor
        passes when you&apos;re away. You&apos;re vouching for them, so no estate admin approval is needed,
        and you can remove their access at any time.
      </Text>

      {listError && <Notice message={listError} />}

      {!open ? (
        <Button label="Invite a dependant" variant="secondary" onPress={() => setOpen(true)} className="mb-lg" />
      ) : created ? (
        <Card className="mb-lg">
          <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">Invite created</Text>
          <Text className="mb-md mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
            Share this code with {created.invitee_name ?? formatPhoneForDisplay(created.phone)}. They sign up
            using {formatPhoneForDisplay(created.phone)}. It works once, for 7 days.
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
                  {l.hint && (
                    <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">{l.hint}</Text>
                  )}
                  {l.points?.map((point) => (
                    <Text key={point} className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                      {'\u2022  '}
                      {point}
                    </Text>
                  ))}
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Dependant's name"
            showLabel
            placeholder="e.g. Tola Adeyemi"
            autoComplete="name"
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />
          <View className="flex-row items-end gap-sm">
            <View className="flex-1">
              <Input
                label="Dependant's phone number"
                showLabel
                placeholder="e.g. 0803 123 4567"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  if (phoneError) setPhoneError(undefined);
                }}
                error={phoneError}
              />
            </View>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={handlePickContact}
                accessibilityRole="button"
                accessibilityLabel="Pick from contacts"
                hitSlop={8}
                className="mb-lg h-[52px] w-[52px] items-center justify-center rounded-md border border-paper-200 bg-white active:opacity-70 dark:border-ink-border dark:bg-ink-surface"
              >
                <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              </Pressable>
            )}
          </View>
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
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                {invite.invitee_name || formatPhoneForDisplay(invite.phone) || invite.email || 'Invite'}
              </Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                {[invite.invitee_name ? formatPhoneForDisplay(invite.phone) : null, LEVEL_LABEL[invite.access_level]]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text className="mt-0.5 text-[12px] text-paper-400 dark:text-ink-textMuted">
                Invite code {invite.code}
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
