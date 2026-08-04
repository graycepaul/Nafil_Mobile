import { View, Text } from 'react-native';
import { Button } from './Button';
import { Overlay } from './Overlay';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Cross-platform confirmation dialog — see `Overlay` for why this isn't RN's `Modal`. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Overlay visible={visible} onDismiss={onCancel}>
      <View className="w-full rounded-lg bg-white p-xl shadow-lg dark:bg-ink-bg">
        <Text className="text-lg font-semibold text-paper-900 dark:text-ink-text">{title}</Text>
        {message && (
          <Text className="mt-sm text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
            {message}
          </Text>
        )}

        <View className="mt-xl flex-row gap-sm">
          <Button label={cancelLabel} variant="secondary" onPress={onCancel} className="flex-1" />
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            onPress={onConfirm}
            loading={loading}
            className="flex-1"
          />
        </View>
      </View>
    </Overlay>
  );
}
