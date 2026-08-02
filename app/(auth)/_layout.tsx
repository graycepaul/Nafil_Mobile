import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // The AuthShell provides its own hero and back affordance.
        animation: 'slide_from_right',
      }}
    />
  );
}
