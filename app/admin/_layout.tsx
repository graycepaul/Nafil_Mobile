import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { useAuthStore } from '../../store/auth-store';
import { themedTabOptions } from '../../components/ui/tab-options';
import { AdminHeaderActions } from '../../components/ui/AdminHeaderActions';

export default function AdminLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  // finance handles marketplace/transfers/dues only — residents, staff,
  // issues, and announcements aren't its concern, so those tabs don't exist
  // for it at all rather than being reachable-but-empty.
  const isFinance = profile?.role === 'finance';

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
          href: isFinance ? null : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          href: isFinance ? null : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="shield-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: 'Issues',
          href: isFinance ? null : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="build-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announcements',
          href: isFinance ? null : undefined,
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
        // Reached via the Dashboard header's market icon (super_admin/finance only).
        options={{ title: 'Marketplace', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="marketplace-listing"
        // Reached by tapping a listing on the Marketplace screen.
        options={{ title: 'Listing', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="transfers"
        // Reached via the Dashboard's "Pending transfers" stat card.
        options={{ title: 'Pending transfers', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="dues"
        // Reached via the Dashboard's "Estate dues" stat card.
        options={{ title: 'Estate dues', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="dues-new"
        // Reached via the Estate dues screen's + icon.
        options={{ title: 'Assign a due', href: null, headerShown: false }}
      />
    </Tabs>
  );
}
