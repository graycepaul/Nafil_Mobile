import { Tabs } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';

export default function SecurityLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={themedTabOptions(colors)}>
      <Tabs.Screen name="index" options={{ title: 'Scan' }} />
      <Tabs.Screen name="active" options={{ title: 'On-site' }} />
      <Tabs.Screen name="alert" options={{ title: 'Alert' }} />
    </Tabs>
  );
}
