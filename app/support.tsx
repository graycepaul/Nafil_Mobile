import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme-context';
import { useAuthStore } from '../store/auth-store';
import { Card } from '../components/ui/Card';
import { ArrowLeftIcon } from '../components/ui/icons';

/**
 * Shared across every role, same reasoning as /settings — nothing here is
 * role-specific. There's no support-ticket system yet, so this is a direct
 * line to the estate's own admin/management contact rather than a fake
 * "submit a ticket" flow that goes nowhere.
 */
export default function SupportScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, typography, radius } = useTheme();

  const email = 'support@nafilestates.com';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing['2xl'],
          paddingBottom: spacing.lg,
          gap: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ArrowLeftIcon color={colors.text} size={22} />
        </Pressable>
        <Text style={[typography.heading, { color: colors.text }]}>Support</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        {profile?.role === 'resident' && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: spacing.xs }]}>
              Something broken at home?
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Maintenance and estate issues go through Issues, not here — your admin sees those
              directly.
            </Text>
            <Pressable
              onPress={() => router.push('/resident/issues')}
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={[typography.bodyStrong, { color: colors.primary }]}>Go to Issues</Text>
            </Pressable>
          </Card>
        )}

        <Card>
          <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: spacing.xs }]}>
            Contact Nafil Estates
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
            App problems, account access, or anything else — reach us directly.
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${email}`)}
            style={{
              borderRadius: radius.md,
              backgroundColor: colors.buttonFill,
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={[typography.bodyStrong, { color: colors.onButtonFill }]}>{email}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}
