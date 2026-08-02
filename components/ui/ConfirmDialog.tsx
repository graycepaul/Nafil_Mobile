import { Modal, View, Text, Pressable } from 'react-native';
import { useTheme } from '../../context/theme-context';
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
  const { colors, spacing, radius, typography, elevation } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 17, 22, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            {
              width: '100%',
              maxWidth: 360,
              backgroundColor: colors.background,
              borderRadius: radius.lg,
              padding: spacing.xl,
            },
            elevation.raised,
          ]}
        >
          <Text style={[typography.subheading, { color: colors.text }]}>{title}</Text>
          {message && (
            <Text
              style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 19 }]}
            >
              {message}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
