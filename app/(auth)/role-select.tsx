import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { AuthShell } from '../../components/auth/AuthShell';
import { RoleCard } from '../../components/auth/RoleCard';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Button } from '../../components/ui/Button';

type SignupRole = 'resident' | 'staff';

/**
 * "Sign up as" — the fork between the two ways a person gets into Nafil Estates.
 *
 * Only resident is a real open signup. Security/staff accounts are provisioned by
 * an estate admin (the employer), not self-registered — a stranger self-declaring
 * "I'm security" and getting waved through by a busy admin would hand them live
 * gate-verification access before any real vetting happened. Admin accounts are
 * never self-serve at all; the first admin is bootstrapped directly against the
 * database (see Nafil Backend/README.md), and every admin after that is created by
 * an existing admin — there's no path to "admin" from this screen, deliberately.
 */
export default function RoleSelectScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [role, setRole] = useState<SignupRole | null>(null);

  function handleContinue() {
    if (role === 'resident') router.push('/signup');
    if (role === 'staff') router.push('/staff-access');
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
          description="Manage visitors, pay dues, and report issues in your home."
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
      </View>

      <Button label="Continue" onPress={handleContinue} disabled={!role} className="mt-xl" />
    </AuthShell>
  );
}
