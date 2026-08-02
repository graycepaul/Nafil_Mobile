import { Tabs } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { themedTabOptions } from '../../components/ui/tab-options';

export default function ResidentLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={themedTabOptions(colors)}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="id-card" options={{ title: 'ID Card' }} />
      <Tabs.Screen name="visitor-pass" options={{ title: 'Visitors' }} />
      <Tabs.Screen name="issues" options={{ title: 'Issues' }} />
      <Tabs.Screen name="announcements" options={{ title: 'Announcements' }} />
    </Tabs>
  );
}
