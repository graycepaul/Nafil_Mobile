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
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  return (
    <AuthShell title="Security & Staff" onBack={() => router.back()}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.primaryMuted,
          borderRadius: radius.lg,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.full,
            backgroundColor: colors.buttonFill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldIcon color={colors.onButtonFill} size={26} />
        </View>

        <Text
          style={[
            typography.bodyStrong,
            { color: colors.text, marginTop: spacing.md, textAlign: 'center' },
          ]}
        >
          Security and staff accounts are set up by your estate administrator
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              marginTop: spacing.sm,
              textAlign: 'center',
              lineHeight: 19,
            },
          ]}
        >
          Your admin sends an invite code when they add you. If you have one, enter it below.
          If not, ask your admin to add you first.
        </Text>
      </View>

      <Button label="I have an invite code" onPress={() => router.push('/staff-invite')} />

      <View style={{ marginTop: spacing.md }}>
        <Button label="Back to sign in" variant="secondary" onPress={() => router.replace('/login')} />
      </View>
    </AuthShell>
  );
}
