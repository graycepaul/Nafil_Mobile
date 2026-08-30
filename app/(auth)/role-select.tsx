import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { AuthShell } from '../../components/auth/AuthShell';
import { RoleCard } from '../../components/auth/RoleCard';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Button } from '../../components/ui/Button';

type SignupRole = 'resident' | 'staff' | 'community';

/**
 * "Sign up as" — the fork between the ways a person gets into Nafil Estates.
 *
 * Resident is a real open signup. Security/staff accounts are provisioned by
 * an estate admin (the employer), not self-registered — a stranger self-declaring
 * "I'm security" and getting waved through by a busy admin would hand them live
 * gate-verification access before any real vetting happened. There's still no
 * path here to becoming an admin *of an existing estate* — every admin after
 * the first is created by that estate's own admin, never self-serve.
 *
 * "Register a new community" is a different thing entirely: it doesn't grant
 * admin over an estate that already exists, it creates the estate itself and
 * makes the signing-up person its first admin — there's no one else to
 * approve them against, since they ARE the estate's founding account. This is
 * the self-serve onboarding path for a brand-new estate that isn't on the
 * platform yet.
 */
export default function RoleSelectScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [role, setRole] = useState<SignupRole | null>(null);

  function handleContinue() {
    if (role === 'resident') router.push('/signup');
    if (role === 'staff') router.push('/staff-access');
    if (role === 'community') router.push('/create-community');
  }

  return (
    <AuthShell
      title="How will you be using Nafil Estates?"
      subtitle="This determines what your account can see and do."
      onBack={() => router.back()}
    >
      <View className="gap-md" accessibilityRole="radiogroup">
        <RoleCard
          icon={<Ionicons name="home-outline" size={22} color={role === 'resident' ? colors.onButtonFill : colors.textMuted} />}
          title="Resident"
          description="Manage visitors, track household access, and report issues in your home."
          selected={role === 'resident'}
          onPress={() => setRole('resident')}
        />
        <RoleCard
          icon={<Ionicons name="shield-checkmark-outline" size={22} color={role === 'staff' ? colors.onButtonFill : colors.textMuted} />}
          title="Security & Staff"
          description="Verify visitors and manage gate access for your estate."
          selected={role === 'staff'}
          onPress={() => setRole('staff')}
        />
        <RoleCard
          icon={<Ionicons name="business-outline" size={22} color={role === 'community' ? colors.onButtonFill : colors.textMuted} />}
          title="Register a new community"
          description="Onboard your estate onto Nafil Estates and become its first admin."
          selected={role === 'community'}
          onPress={() => setRole('community')}
        />
      </View>

      <Button label="Continue" onPress={handleContinue} disabled={!role} className="mt-xl" />
    </AuthShell>
  );
}
