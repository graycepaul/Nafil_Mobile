import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';

/** Dashboard's header-right row: market (finance/super_admin only), notifications, then settings — same pattern as resident's HomeHeaderActions. */
export function AdminHeaderActions() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const canManageMarket = profile?.role === 'super_admin' || profile?.role === 'finance';

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

  // Same queryKey the Dashboard's own stat card uses — React Query dedupes
  // this into a single request/cache entry rather than fetching it twice.
  const { data: listingCount } = useQuery({
    queryKey: ['dashboard_listing_count', profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count ?? 0;
    },
    enabled: !!profile && canManageMarket,
  });

  return (
    <View className="flex-row items-center gap-md pr-lg">
      {canManageMarket && (
        <Pressable
          onPress={() => router.push('/admin/marketplace')}
          accessibilityRole="button"
          accessibilityLabel={listingCount ? `Marketplace, ${listingCount} active listings` : 'Marketplace'}
          hitSlop={8}
          className="relative"
        >
          <Ionicons name="storefront-outline" size={20} color={colors.onHeaderBg} />
          {!!listingCount && (
            <View className="absolute -right-[6px] -top-[4px] h-[9px] w-[9px] rounded-full border border-white bg-danger dark:border-ink-bg" />
          )}
        </Pressable>
      )}
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
