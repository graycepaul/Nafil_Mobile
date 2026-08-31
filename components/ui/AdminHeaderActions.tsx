import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';

/** Dashboard's header-right row: notifications, then settings — same pattern as resident's HomeHeaderActions. */
export function AdminHeaderActions() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications_unread', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile,
    refetchInterval: 30_000,
  });

  return (
    <View className="flex-row items-center gap-md pr-lg">
      <Pressable
        onPress={() => router.push('/admin/notifications')}
        accessibilityRole="button"
        accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        hitSlop={8}
        className="relative"
      >
        <Ionicons name="notifications-outline" size={20} color={colors.onHeaderBg} />
        {!!unreadCount && (
          <View className="absolute -right-[6px] -top-[4px] h-[9px] w-[9px] rounded-full border border-white bg-danger dark:border-ink-bg" />
        )}
      </Pressable>
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
      >
        <Ionicons name="settings-outline" size={20} color={colors.onHeaderBg} />
      </Pressable>
    </View>
  );
}
