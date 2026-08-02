import { Pressable, Text } from 'react-native';
import { useAuthStore } from '../store/auth-store';
import { useTheme } from '../context/theme-context';

export function SignOutButton() {
  const signOut = useAuthStore((s) => s.signOut);
  const { colors, spacing } = useTheme();

  return (
    <Pressable onPress={signOut} accessibilityRole="button" style={{ padding: spacing.sm }}>
      <Text style={{ color: colors.danger, fontWeight: '600' }}>Sign out</Text>
    </Pressable>
  );
}
