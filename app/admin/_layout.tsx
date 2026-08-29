import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';
import { AdminHeaderActions } from '../../components/ui/AdminHeaderActions';

export default function AdminLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={themedTabOptions(colors, insets.bottom)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerRight: () => <AdminHeaderActions />,
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="residents"
        options={{
          title: 'Residents',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          tabBarIcon: ({ color }) => <Ionicons name="shield-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: 'Issues',
          tabBarIcon: ({ color }) => <Ionicons name="build-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announcements',
          tabBarIcon: ({ color }) => <Ionicons name="megaphone-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        // Reached via the Dashboard header's bell, not a tab of its own.
        options={{ title: 'Notifications', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="marketplace"
        // Reached via the Dashboard's "Marketplace listings" stat card.
        options={{ title: 'Marketplace', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="transfers"
        // Reached via the Dashboard's "Pending transfers" stat card.
        options={{ title: 'Pending transfers', href: null, headerShown: false }}
      />
    </Tabs>
  );
}
