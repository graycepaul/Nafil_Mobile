import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/theme-context';
import { useAuthStore } from '../store/auth-store';
import { useEmergencyAlertStore } from '../store/emergency-alert-store';
import { Overlay } from './ui/Overlay';
import { Button } from './ui/Button';
import type { UserRole } from '../types/database';

const ROLE_HOME: Record<UserRole, string> = {
  resident: '/resident',
  security: '/security',
  admin: '/admin',
  super_admin: '/admin',
  finance: '/admin',
};

/**
 * Rendered once at the app root (app/_layout.tsx) - not per-screen - so an
 * emergency alert interrupts whatever the resident is doing, not just the
 * ones who happen to be looking at Home or the notifications list. Set by
 * the foreground notification listener; a background/killed-app push still
 * only gets the OS banner (there's no JS running to show this until the app
 * is actually open).
 */
export function EmergencyAlertModal() {
  const router = useRouter();
  const { colors } = useTheme();
  const role = useAuthStore((s) => s.profile?.role);
  const alert = useEmergencyAlertStore((s) => s.alert);
  const dismiss = useEmergencyAlertStore((s) => s.dismiss);

  return (
    <Overlay visible={!!alert} onDismiss={dismiss}>
      <View className="w-full rounded-lg bg-white p-xl shadow-lg dark:bg-ink-bg">
        <View className="mb-md flex-row items-center gap-sm">
          <Ionicons name="warning" size={22} color={colors.danger} />
          <Text className="text-[13px] font-bold uppercase tracking-wide text-danger">
            Emergency alert
          </Text>
        </View>

        <Text className="text-lg font-semibold text-paper-900 dark:text-ink-text">
          {alert?.title}
        </Text>
        <Text className="mt-sm text-[14px] leading-[20px] text-paper-500 dark:text-ink-textMuted">
          {alert?.body}
        </Text>

        <View className="mt-xl flex-row gap-sm">
          <Button label="Dismiss" variant="secondary" onPress={dismiss} className="flex-1" />
          <Button
            label="View"
            variant="danger"
            onPress={() => {
              dismiss();
              if (role) router.push(ROLE_HOME[role] as never);
            }}
            className="flex-1"
          />
        </View>
      </View>
    </Overlay>
  );
}
