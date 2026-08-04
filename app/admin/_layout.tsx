import { Tabs } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';
import { SettingsHeaderButton } from '../../components/ui/SettingsHeaderButton';
import { UserIcon, WrenchIcon, MegaphoneIcon } from '../../components/ui/icons';

export default function AdminLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={themedTabOptions(colors)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Residents',
          headerRight: () => <SettingsHeaderButton />,
          tabBarIcon: ({ color }) => <UserIcon color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{ title: 'Issues', tabBarIcon: ({ color }) => <WrenchIcon color={color as string} size={22} /> }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announcements',
          tabBarIcon: ({ color }) => <MegaphoneIcon color={color as string} size={22} />,
        }}
      />
    </Tabs>
  );
}
