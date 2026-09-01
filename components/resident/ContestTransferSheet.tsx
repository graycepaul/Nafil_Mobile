import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira } from '../../lib/format';
import { pickPhoto } from '../../lib/pick-photo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';
import type { Transfer } from '../../types/database';

/**
 * Lets a resident contest a rejected transfer: attach a fresh proof of
 * payment and resubmit. `onConfirm` uploads the photo and calls
 * `contest_transfer`, which flips the transfer back to 'pending' for
 * finance/super_admin to review again.
 */
export function ContestTransferSheet({
  transfer,
  onConfirm,
  onCancel,
}: {
  transfer: Transfer;
  onConfirm: (photo: { uri: string; mimeType: string | null }) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string | null }>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handlePick() {
    setError(undefined);
    const result = await pickPhoto();
    if ('error' in result) return setError(result.error);
    if ('cancelled' in result) return;
    setPhoto(result);
  }

  async function handleSubmit() {
    if (!photo) return;
    setSubmitting(true);
    await onConfirm(photo);
    setSubmitting(false);
  }

  return (
    <Card className="mb-0 bg-white p-lg dark:bg-ink-surface">
      <Text className="mb-xs text-lg font-semibold text-paper-900 dark:text-ink-text">Contest rejection</Text>
      <Text className="mb-lg text-[28px] font-bold text-paper-900 dark:text-ink-text">
        {formatNaira(transfer.amount)}
      </Text>
      <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
        {transfer.label} was rejected. Upload a proof of payment (a screenshot or receipt of the transfer) and
        we&apos;ll send it back to estate management for another look.
      </Text>

      {photo ? (
        <Pressable onPress={handlePick} accessibilityRole="button" className="mb-lg items-center">
          <Image source={{ uri: photo.uri }} className="h-40 w-full rounded-md" resizeMode="cover" />
          <Text className="mt-sm text-[13px] font-semibold text-brand-800 dark:text-brand-300">Change photo</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={handlePick}
          accessibilityRole="button"
          accessibilityLabel="Attach proof of payment"
          className="mb-lg items-center gap-sm rounded-md border border-dashed border-paper-200 p-xl dark:border-ink-border"
        >
          <Ionicons name="cloud-upload-outline" size={22} color={colors.textMuted} />
          <Text className="text-[13px] font-semibold text-paper-900 dark:text-ink-text">Attach proof of payment</Text>
        </Pressable>
      )}

      {error && <Notice message={error} />}

      <View className="flex-row gap-sm">
        <Button label="Cancel" variant="ghost" onPress={onCancel} className="flex-1" />
        <Button
          label="Resubmit"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!photo}
          className="flex-1"
        />
      </View>
    </Card>
  );
}
