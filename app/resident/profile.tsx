import { useRef, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { shareHouseholdCardImage } from '../../lib/share-id-card';
import { pickAndUploadHouseholdAvatar } from '../../lib/avatar';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { IDCardView } from '../../components/ui/IDCardView';
import { AddHouseholdMemberForm } from '../../components/resident/AddHouseholdMemberForm';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Overlay } from '../../components/ui/Overlay';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import type { Estate, HouseholdMember } from '../../types/database';

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [viewingMember, setViewingMember] = useState<HouseholdMember | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<HouseholdMember | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [addingPhotoId, setAddingPhotoId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const cardShotRef = useRef<ViewShotRef>(null);

  const { data: estate } = useQuery({
    queryKey: ['my_estate', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estates')
        .select('*')
        .eq('id', profile!.estate_id!)
        .single();
      if (error) throw error;
      return data as Estate;
    },
    enabled: !!profile?.estate_id,
  });

  const {
    data: household,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['household_members', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HouseholdMember[];
    },
    enabled: !!profile,
  });

  function invalidateHousehold() {
    queryClient.invalidateQueries({ queryKey: ['household_members', profile?.id] });
  }

  async function regenerateCode() {
    setRegenerating(true);
    const { error } = await supabase.rpc('regenerate_resident_code');
    setRegenerating(false);
    setConfirmingRegenerate(false);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshProfile();
    setNotice('New code generated. Your old card no longer works.');
  }

  async function addPhotoToMember(member: HouseholdMember) {
    setAddingPhotoId(member.id);
    const result = await pickAndUploadHouseholdAvatar(profile!.id, member.id);
    setAddingPhotoId(null);
    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }
    if ('cancelled' in result) return;
    const { error: updateError } = await supabase
      .from('household_members')
      .update({ avatar_url: result.url })
      .eq('id', member.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidateHousehold();
    setViewingMember((current) => (current?.id === member.id ? { ...current, avatar_url: result.url! } : current));
  }

  async function shareCard() {
    if (!viewingMember) return;
    setSharing(true);
    try {
      const uri = await cardShotRef.current?.capture?.();
      const outcome = uri
        ? await shareHouseholdCardImage(uri, viewingMember, estate?.name)
        : 'dismissed';
      if (outcome === 'downloaded') setNotice('Saved. Attach the image in WhatsApp.');
      if (outcome === 'copied') setNotice('Copied. Paste it into WhatsApp.');
    } finally {
      setSharing(false);
    }
  }

  async function revokeMember() {
    if (!pendingRevoke) return;
    const id = pendingRevoke.id;
    setRevokingId(id);
    const { error } = await supabase.from('household_members').update({ status: 'revoked' }).eq('id', id);
    setRevokingId(null);
    setPendingRevoke(null);
    if (error) {
      setError(error.message);
      return;
    }
    invalidateHousehold();
  }

  // Distinct from revoke: the review cadence lapsed on its own, the
  // resident didn't choose to cut this person off. Reactivating just flips
  // status back to 'active'. The DB trigger recomputes next_review_at from
  // the stored review_frequency, so there's nothing else to send here.
  async function reactivateMember(member: HouseholdMember) {
    setRevokingId(member.id);
    const { error } = await supabase.from('household_members').update({ status: 'active' }).eq('id', member.id);
    setRevokingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice(`${member.full_name}'s card is active again.`);
    invalidateHousehold();
  }

  if (isLoading || !profile) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <CardSkeletonList media />
      </View>
    );
  }

  return (
    <>
      <FlatList
        className="bg-white dark:bg-ink-bg"
        contentContainerClassName="p-xl"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        data={household ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <IDCardView
              photoUrl={profile.avatar_url}
              name={profile.full_name ?? 'You'}
              subtitle={profile.unit_no ? `Unit ${profile.unit_no}` : undefined}
              estateName={estate?.name}
              code={profile.resident_code ?? 'N/A'}
            />

            <Button
              label="Regenerate my code"
              variant="ghost"
              onPress={() => setConfirmingRegenerate(true)}
              className="mb-2xl mt-md"
            />

            <Text className="mb-xs text-lg font-semibold text-paper-900 dark:text-ink-text">
              Household & frequent visitors
            </Text>
            <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
              Give family, house help, or a regular driver their own standing card. No need to
              generate a new visitor pass every time they come.
            </Text>

            <AddHouseholdMemberForm
              residentId={profile.id}
              estateId={profile.estate_id!}
              onCreated={invalidateHousehold}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No one added yet"
            message="Add a household member or frequent visitor above to give them their own gate card."
          />
        }
        renderItem={({ item }) => (
          <Card>
            <Pressable
              onPress={() => setViewingMember(item)}
              className="flex-row items-center gap-md"
            >
              <Avatar uri={item.avatar_url} name={item.full_name} size={44} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {item.full_name}
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {item.relationship} · Code: {item.code}
                </Text>
              </View>
              <StatusBadge
                label={
                  item.status === 'revoked'
                    ? 'Revoked'
                    : item.status === 'pending_review'
                      ? 'Needs review'
                      : 'Active'
                }
                tone={
                  item.status === 'revoked'
                    ? 'danger'
                    : item.status === 'pending_review'
                      ? 'warning'
                      : 'success'
                }
              />
            </Pressable>
            {item.status === 'active' && !item.avatar_url && (
              <Text className="mt-sm text-[13px] text-danger">
                No photo yet. Add one so security can check it against their face at the gate.
              </Text>
            )}
            {item.status === 'pending_review' && (
              <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
                This card&apos;s review period lapsed and was deactivated automatically. Reactivate
                it if {item.full_name} should still have access.
              </Text>
            )}
            {item.status === 'active' && (
              <View className="mt-md flex-row gap-sm">
                {item.avatar_url ? (
                  <Button
                    label="View card"
                    variant="secondary"
                    onPress={() => setViewingMember(item)}
                    className="flex-1"
                  />
                ) : (
                  <Button
                    label="Add photo"
                    variant="secondary"
                    loading={addingPhotoId === item.id}
                    onPress={() => addPhotoToMember(item)}
                    className="flex-1"
                  />
                )}
                <Button
                  label="Revoke"
                  variant="ghost"
                  loading={revokingId === item.id}
                  onPress={() => setPendingRevoke(item)}
                />
              </View>
            )}
            {item.status === 'pending_review' && (
              <Button
                label="Reactivate"
                className="mt-md"
                loading={revokingId === item.id}
                onPress={() => reactivateMember(item)}
              />
            )}
          </Card>
        )}
      />

      <Toast
        message={error ?? notice}
        tone={error ? 'error' : 'success'}
        onDismiss={() => {
          setError(undefined);
          setNotice(undefined);
        }}
      />

      <Overlay visible={!!viewingMember} onDismiss={() => setViewingMember(null)}>
        {viewingMember && (
          <>
            {/* What the resident actually sees — plain card, no mat. */}
            <IDCardView
              photoUrl={viewingMember.avatar_url}
              name={viewingMember.full_name}
              subtitle={viewingMember.relationship}
              estateName={estate?.name}
              code={viewingMember.code}
              revoked={viewingMember.status === 'revoked'}
            />

            {/* Off-screen twin, captured for sharing instead of the card
                above. It's matted on a solid frame rather than captured
                tight to its own edge — html2canvas (react-native-view-shot's
                web capture backend) doesn't anti-alias a border-radius
                cleanly against nothing, leaving a stray light sliver right
                at the corners. A solid backdrop behind it hides that seam
                instead of fighting it, and reads as an intentional
                card-on-a-mat look rather than a bug. Kept out of the visible
                layout (absolute + far off-screen, not display:none — a
                non-rendered node has no bitmap for html2canvas to grab). */}
            <View
              style={{ position: 'absolute', left: -9999, top: 0 }}
              pointerEvents="none"
            >
              <ViewShot ref={cardShotRef} options={{ format: 'png', quality: 1 }}>
                <View className="items-center rounded-xl bg-paper-100 p-xl">
                  <IDCardView
                    photoUrl={viewingMember.avatar_url}
                    name={viewingMember.full_name}
                    subtitle={viewingMember.relationship}
                    estateName={estate?.name}
                    code={viewingMember.code}
                    revoked={viewingMember.status === 'revoked'}
                    elevated={false}
                  />
                </View>
              </ViewShot>
            </View>
            <View className="mt-lg flex-row gap-sm">
              {viewingMember.status === 'active' &&
                (viewingMember.avatar_url ? (
                  <Button
                    label="Share"
                    variant="secondary"
                    loading={sharing}
                    onPress={shareCard}
                    className="flex-1"
                  />
                ) : (
                  <Button
                    label="Add photo to share"
                    variant="secondary"
                    loading={addingPhotoId === viewingMember.id}
                    onPress={() => addPhotoToMember(viewingMember)}
                    className="flex-1"
                  />
                ))}
              <Button label="Close" onPress={() => setViewingMember(null)} className="flex-1" />
            </View>
          </>
        )}
      </Overlay>

      <ConfirmDialog
        visible={!!pendingRevoke}
        title="Revoke this card?"
        message={
          pendingRevoke
            ? `${pendingRevoke.full_name}'s code (${pendingRevoke.code}) will stop working immediately.`
            : undefined
        }
        confirmLabel="Revoke"
        cancelLabel="Keep"
        destructive
        loading={!!revokingId}
        onConfirm={revokeMember}
        onCancel={() => setPendingRevoke(null)}
      />

      <ConfirmDialog
        visible={confirmingRegenerate}
        title="Regenerate your code?"
        message="Your current ID card (printed or on-screen) will stop working immediately. Only do this if you think your code was seen by someone it shouldn't have been."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        destructive
        loading={regenerating}
        onConfirm={regenerateCode}
        onCancel={() => setConfirmingRegenerate(false)}
      />
    </>
  );
}
