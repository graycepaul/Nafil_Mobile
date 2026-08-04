import { Tabs } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';
import { SettingsHeaderButton } from '../../components/ui/SettingsHeaderButton';
import { ScanIcon, ClockIcon, AlertTriangleIcon } from '../../components/ui/icons';

export default function SecurityLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={themedTabOptions(colors)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          headerRight: () => <SettingsHeaderButton />,
          tabBarIcon: ({ color }) => <ScanIcon color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="active"
        options={{ title: 'On-site', tabBarIcon: ({ color }) => <ClockIcon color={color as string} size={22} /> }}
      />
      <Tabs.Screen
        name="alert"
        options={{ title: 'Alert', tabBarIcon: ({ color }) => <AlertTriangleIcon color={color as string} size={22} /> }}
      />
    </Tabs>
  );
}
