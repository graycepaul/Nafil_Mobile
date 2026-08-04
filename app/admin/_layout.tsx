import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';
import { SettingsHeaderButton } from '../../components/ui/SettingsHeaderButton';

export default function AdminLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={themedTabOptions(colors, insets.bottom)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Residents',
          headerRight: () => <SettingsHeaderButton />,
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color as string} size={22} />,
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
    </Tabs>
  );
}
