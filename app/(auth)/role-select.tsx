import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { AuthShell } from '../../components/auth/AuthShell';
import { RoleCard } from '../../components/auth/RoleCard';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Button } from '../../components/ui/Button';

type SignupRole = 'resident' | 'staff' | 'dependant';

/**
 * "Sign up as" - the fork between the ways a person gets into Nafil Estates.
 *
 * Dependants (household members a resident invites) are their own option
 * rather than a link buried in the resident signup form: they don't register
 * with an email or wait for admin approval, they join with the invite code
 * their resident sent.
 *
 * Resident is a real open signup. Security/staff accounts are provisioned by
 * an estate admin (the employer), not self-registered - a stranger self-declaring
 * "I'm security" and getting waved through by a busy admin would hand them live
 * gate-verification access before any real vetting happened. There's still no
 * path here to becoming an admin *of an existing estate* - every admin after
 * the first is created by that estate's own admin, never self-serve.
 *
 * There used to be a third option here ("Register a new community" ->
 * /create-community) for self-serve onboarding of a brand-new estate. This
 * was never actually a multi-tenant SaaS in practice - one client, one
 * estate - so that path is gone: removed here, and the route itself deleted
 * (not just unlinked) since a stray deep link would otherwise still reach
 * it. The signup metadata shape it used to send is also rejected at the
 * database trigger that would have created the new estate
 * (0048_block_new_community_signup.sql), so even a direct API call can't
 * revive it - this isn't just a hidden button.
 */
export default function RoleSelectScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [role, setRole] = useState<SignupRole | null>(null);

  function handleContinue() {
    if (role === 'resident') router.push('/signup');
    if (role === 'staff') router.push('/staff-access');
    if (role === 'dependant') router.push('/household-invite');
  }

  return (
    <AuthShell
      title="How will you be using Nafil Estates?"
      subtitle="This determines what your account can see and do."
      onBack={() => router.back()}
    >
      <View className="gap-md" accessibilityRole="radiogroup">
        <RoleCard
          icon={<Ionicons name="shield-checkmark-outline" size={22} color={role === 'staff' ? colors.onButtonFill : colors.textMuted} />}
          title="Security & Staff"
          description="Verify visitors and manage gate access for your estate."
          selected={role === 'staff'}
          onPress={() => setRole('staff')}
        />
        <RoleCard
          icon={<Ionicons name="home-outline" size={22} color={role === 'resident' ? colors.onButtonFill : colors.textMuted} />}
          title="Resident"
          description="Manage visitors, track household access, and report issues in your home."
          selected={role === 'resident'}
          onPress={() => setRole('resident')}
        />
        <RoleCard
          icon={<Ionicons name="people-outline" size={22} color={role === 'dependant' ? colors.onButtonFill : colors.textMuted} />}
          title="Dependant"
          description="Get your personalised access ID card, invite visitors and purchase items from the marketplace."
          selected={role === 'dependant'}
          onPress={() => setRole('dependant')}
        />
      </View>

      <Button label="Continue" onPress={handleContinue} disabled={!role} className="mt-xl" />
    </AuthShell>
  );
}
