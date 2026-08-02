import { useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { pickAndUploadHouseholdAvatar } from '../../lib/avatar';
import { useTheme } from '../../context/theme-context';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Notice } from '../ui/Notice';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import type { HouseholdMember } from '../../types/database';

/**
 * Adds a standing allow-list entry — a family member, a nanny, a regular
 * driver — someone who shouldn't need a fresh visitor pass every time they
 * come. Creates the record first (name/relationship/phone only), then offers
 * a photo as a second step once the row — and its id, needed for the avatar
 * upload path — actually exists. Mirrors InviteStaffForm's create → share
 * two-step shape.
 */
export function AddHouseholdMemberForm({
  residentId,
  estateId,
  onCreated,
}: {
  residentId: string;
  estateId: string;
  onCreated: () => void;
}) {
  const { colors, spacing, typography } = useTheme();

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [created, setCreated] = useState<HouseholdMember | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  function reset() {
    setOpen(false);
    setFullName('');
    setRelationship('');
    setPhone('');
    setFormError(undefined);
    setCreated(null);
  }

  function finish() {
    reset();
    onCreated();
  }

  async function handleCreate() {
    if (!fullName.trim() || !relationship.trim()) return;
    setFormError(undefined);
    setCreating(true);
    const { data, error } = await supabase
      .from('household_members')
      .insert({
        estate_id: estateId,
        resident_id: residentId,
        full_name: fullName.trim(),
        relationship: relationship.trim(),
        phone: phone.trim() || null,
      })
      .select()
      .single();
    setCreating(false);

    if (error) {
      setFormError(error.message);
      return;
    }
    setCreated(data as HouseholdMember);
  }

  async function addPhoto() {
    if (!created) return;
    setUploadingPhoto(true);
    const result = await pickAndUploadHouseholdAvatar(residentId, created.id);
    setUploadingPhoto(false);
    if ('error' in result && result.error) {
      setFormError(result.error);
      return;
    }
    if ('cancelled' in result) return;
    await supabase.from('household_members').update({ avatar_url: result.url }).eq('id', created.id);
    setCreated({ ...created, avatar_url: result.url! });
  }

  if (!open) {
    return (
      <Button
        label="+ Add household member"
        variant="secondary"
        onPress={() => setOpen(true)}
        style={{ marginBottom: spacing.xl }}
      />
    );
  }

  if (created) {
    return (
      <Card style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>
          {created.full_name} added
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }]}>
          Their card is ready — code {created.code}. A photo is optional but helps security recognise them.
        </Text>
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <Avatar uri={created.avatar_url} name={created.full_name} size={64} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label={created.avatar_url ? 'Change photo' : 'Add photo'}
            variant="secondary"
            onPress={addPhoto}
            loading={uploadingPhoto}
            style={{ flex: 1 }}
          />
          <Button label="Done" onPress={finish} style={{ flex: 1 }} />
        </View>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: spacing.xl }}>
      <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: spacing.md }]}>
        Add to your household
      </Text>
      {formError && <Notice message={formError} />}
      <Input label="Full name" placeholder="Full name" value={fullName} onChangeText={setFullName} />
      <Input
        label="Relationship"
        placeholder="Relationship — e.g. Spouse, Nanny, Driver"
        value={relationship}
        onChangeText={setRelationship}
      />
      <Input
        label="Phone (optional)"
        placeholder="Phone (optional)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Add"
          onPress={handleCreate}
          loading={creating}
          disabled={!fullName.trim() || !relationship.trim()}
          style={{ flex: 1 }}
        />
        <Button label="Cancel" variant="secondary" onPress={reset} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}
