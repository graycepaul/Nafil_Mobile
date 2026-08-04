import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';
import { SettingsHeaderButton } from '../../components/ui/SettingsHeaderButton';

export default function SecurityLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={themedTabOptions(colors, insets.bottom)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          headerRight: () => <SettingsHeaderButton />,
          tabBarIcon: ({ color }) => <Ionicons name="scan-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'On-site',
          tabBarIcon: ({ color }) => <Ionicons name="time-outline" color={color as string} size={22} />,
        }}
      />
      <Tabs.Screen
        name="alert"
        options={{
          title: 'Alert',
          tabBarIcon: ({ color }) => <Ionicons name="warning-outline" color={color as string} size={22} />,
        }}
      />
    </Tabs>
  );
}
