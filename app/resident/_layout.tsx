import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions, TAB_PROMOTION_BREAKPOINT } from '../../components/ui/tab-options';
import { HomeHeader } from '../../components/ui/HomeHeader';
import { ProfileHeaderActions } from '../../components/ui/ProfileHeaderActions';

export default function ResidentLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const showExtraTabs = Platform.OS === 'web' && width >= TAB_PROMOTION_BREAKPOINT;

  return (
    <Tabs screenOptions={themedTabOptions(colors, insets.bottom, width)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          header: () => <HomeHeader />,
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="visitor-pass"
        options={{
          title: 'Visitors',
          tabBarIcon: ({ color }) => <Ionicons name="ticket-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <Ionicons name="storefront-outline" color={color as string} size={22} />,
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
        name="profile"
        options={{
          title: 'Profile',
          headerRight: () => <ProfileHeaderActions />,
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        // Reached by tapping the Home header's bell, not a tab of its own —
        // `href: null` registers the route without adding a tab bar button.
        // headerShown: false because the Tabs navigator's default header has
        // no back button for a pushed href:null screen — each of these
        // builds its own header instead, with a working back button.
        options={{ title: 'Notifications', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="visitor-pass-history"
        // Reached via the Visitors tab header's history icon.
        options={{ title: 'Visit history', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="marketplace-listing"
        // Reached by tapping a listing on the Market tab.
        options={{ title: 'Listing', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="marketplace-new"
        // Reached via the Market tab header's + icon.
        options={{ title: 'New listing', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="wallet"
        // Reached via the Profile header's wallet icon. Estate dues live here too.
        options={{ title: 'Wallet', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="store"
        // Reached via the Market tab header's store icon — only shown to residents who have listed something.
        options={{ title: 'My store', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="wallet-transactions"
        // Reached via "See all" on the Wallet screen.
        options={{ title: 'All transactions', href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="announcements"
        // Off the tab bar on a phone-width bottom bar (reached via the
        // floating icon on Issues instead) — promoted to a real tab once
        // there's room for a 6th at tablet width and up.
        options={{
          title: 'Announcements',
          href: showExtraTabs ? undefined : null,
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="megaphone-outline" color={color as string} size={22} />,
        }}
      />
    </Tabs>
  );
}
