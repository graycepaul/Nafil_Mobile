import { Pressable, useWindowDimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';

function SettingsButton() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      className="pr-lg"
    >
      <Ionicons name="settings-outline" size={20} color={colors.onHeaderBg} />
    </Pressable>
  );
}

/** Platform-developer dashboard (dev_admin only). Mirrors the web devControl: overview, estates, users, with a live/test switch. */
export default function DevControlLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <Tabs
      screenOptions={{
        ...themedTabOptions(colors, insets.bottom, width),
        headerRight: () => <SettingsButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <Ionicons name="speedometer-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="estates"
        options={{
          title: 'Estates',
          tabBarIcon: ({ color }) => <Ionicons name="business-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" color={color as string} size={22} />,
        }}
      />
    </Tabs>
  );
}
