import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';
import { HomeHeader } from '../../components/ui/HomeHeader';
import { ProfileHeaderActions } from '../../components/ui/ProfileHeaderActions';

export default function ResidentLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={themedTabOptions(colors, insets.bottom)}>
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
        name="announcements"
        // Reached via the floating icon on the Issues tab — moved out of the
        // tab bar to keep it at 5 tabs.
        options={{ title: 'Announcements', href: null, headerShown: false }}
      />
    </Tabs>
  );
}
