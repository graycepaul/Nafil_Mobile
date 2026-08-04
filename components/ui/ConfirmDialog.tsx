import { Modal, View, Text, Pressable } from 'react-native';
import { Button } from './Button';

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

/**
 * Cross-platform confirmation dialog. Exists because `Alert.alert` — the
 * obvious choice — is a complete no-op on web (react-native-web ships
 * `static alert() {}`, not even a `window.confirm` fallback), which would
 * make any destructive action silently unconfirmable there. `Modal` actually
 * renders on web, so it's the one that works everywhere.
 */
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-black/50 p-xl"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-[360px] rounded-lg bg-white p-xl shadow-lg dark:bg-ink-bg"
        >
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
