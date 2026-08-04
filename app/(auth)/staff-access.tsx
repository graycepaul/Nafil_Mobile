import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { AuthShell } from '../../components/auth/AuthShell';
import { ShieldIcon } from '../../components/auth/RoleIcons';
import { Button } from '../../components/ui/Button';

/**
 * Reached when someone picks "Security & Staff" on the role-select screen.
 *
 * Deliberately not a form — staff accounts are provisioned by an estate admin
 * (the person's actual employer), not self-registered. The admin creates an
 * invite and shares an access code with the new hire through whatever channel
 * they'd already use (WhatsApp, SMS, in person); this screen's job is to
 * point them at where to enter it, not to collect a role claim on trust.
 */
export default function StaffAccessScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <AuthShell title="Security & Staff" onBack={() => router.back()}>
      <View className="mb-xl items-center rounded-lg bg-brand-50 px-lg py-xl dark:bg-brand-900">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-800 dark:bg-brand-500">
          <ShieldIcon color={colors.onButtonFill} size={26} />
        </View>

        <Text className="mt-md text-center text-base font-semibold text-paper-900 dark:text-ink-text">
          Security and staff accounts are set up by your estate administrator
        </Text>
        <Text className="mt-sm text-center text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
          Your admin sends an invite code when they add you. If you have one, enter it below.
          If not, ask your admin to add you first.
        </Text>
      </View>

      <Button label="I have an invite code" onPress={() => router.push('/staff-invite')} />

      <View className="mt-md">
        <Button label="Back to sign in" variant="secondary" onPress={() => router.replace('/login')} />
      </View>
    </AuthShell>
  );
}
