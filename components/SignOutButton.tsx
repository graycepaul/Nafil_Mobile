import { Pressable, Text } from 'react-native';
import { useAuthStore } from '../store/auth-store';

export function SignOutButton() {
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <Pressable onPress={signOut} accessibilityRole="button" className="p-sm">
      <Text className="font-semibold text-danger">Sign out</Text>
    </Pressable>
  );
}
