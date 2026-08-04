import { Tabs } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';
import { BrandLockup } from '../../components/ui/BrandMark';
import { HomeHeaderActions } from '../../components/ui/HomeHeaderActions';
import { SettingsHeaderButton } from '../../components/ui/SettingsHeaderButton';
import { HomeIcon, TicketIcon, WrenchIcon, MegaphoneIcon, UserIcon } from '../../components/ui/icons';

export default function ResidentLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={themedTabOptions(colors)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: () => <BrandLockup size="sm" />,
          headerRight: () => <HomeHeaderActions />,
          tabBarIcon: ({ color }) => <HomeIcon color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="visitor-pass"
        options={{ title: 'Visitors', tabBarIcon: ({ color }) => <TicketIcon color={color as string} size={22} /> }}
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
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerRight: () => <SettingsHeaderButton />,
          tabBarIcon: ({ color }) => <UserIcon color={color as string} size={22} />,
        }}
      />
    </Tabs>
  );
}
