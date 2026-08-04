import { useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { pickAndUploadHouseholdAvatar } from '../../lib/avatar';
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
        className="mb-xl"
      />
    );
  }

  if (created) {
    return (
      <Card className="mb-xl">
        <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
          {created.full_name} added
        </Text>
        <Text className="mb-md mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
          Their card is ready. Code: {created.code}. A photo is optional but helps security recognise them.
        </Text>
        <View className="mb-md items-center">
          <Avatar uri={created.avatar_url} name={created.full_name} size={64} />
        </View>
        <View className="flex-row gap-sm">
          <Button
            label={created.avatar_url ? 'Change photo' : 'Add photo'}
            variant="secondary"
            onPress={addPhoto}
            loading={uploadingPhoto}
            className="flex-1"
          />
          <Button label="Done" onPress={finish} className="flex-1" />
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-xl">
      <Text className="mb-md text-base font-semibold text-paper-900 dark:text-ink-text">
        Add to your household
      </Text>
      {formError && <Notice message={formError} />}
      <Input label="Full name" placeholder="Full name" value={fullName} onChangeText={setFullName} />
      <Input
        label="Relationship"
        placeholder="Relationship (e.g. Spouse, Nanny, Driver)"
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
      <View className="flex-row gap-sm">
        <Button
          label="Add"
          onPress={handleCreate}
          loading={creating}
          disabled={!fullName.trim() || !relationship.trim()}
          className="flex-1"
        />
        <Button label="Cancel" variant="secondary" onPress={reset} className="flex-1" />
      </View>
    </Card>
  );
}
