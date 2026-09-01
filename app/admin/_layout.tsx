import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { useAuthStore } from '../../store/auth-store';
import { themedTabOptions, TAB_PROMOTION_BREAKPOINT } from '../../components/ui/tab-options';
import { AdminHeaderActions } from '../../components/ui/AdminHeaderActions';

export default function AdminLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const profile = useAuthStore((s) => s.profile);
  // finance handles marketplace/transfers/dues only — residents, staff,
  // issues, and announcements aren't its concern, so those tabs don't exist
  // for it at all rather than being reachable-but-empty.
  const isFinance = profile?.role === 'finance';
  const isSuperAdmin = profile?.role === 'super_admin';
  const canManageMarket = isSuperAdmin || isFinance;
  const showExtraTabs = Platform.OS === 'web' && width >= TAB_PROMOTION_BREAKPOINT;

  return (
    <Tabs screenOptions={themedTabOptions(colors, insets.bottom, width)}>
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
        // super_admin/finance only. Off the tab bar on a phone-width bottom
        // bar (reached via the Dashboard header's market icon instead) —
        // promoted to a real tab once there's room at tablet width and up.
        options={{
          title: 'Marketplace',
          href: canManageMarket && showExtraTabs ? undefined : null,
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="storefront-outline" color={color as string} size={22} />,
        }}
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
        // super_admin only (finance still reaches this via the Dashboard's
        // "Estate dues" stat card and the Marketplace screen's Finance menu,
        // same as on a phone). Promoted to a real tab for super_admin once
        // there's room at tablet width and up.
        options={{
          title: 'Estate dues',
          href: isSuperAdmin && showExtraTabs ? undefined : null,
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="dues-new"
        // Reached via the Estate dues screen's + icon.
        options={{ title: 'Assign a due', href: null, headerShown: false }}
      />
    </Tabs>
  );
}
