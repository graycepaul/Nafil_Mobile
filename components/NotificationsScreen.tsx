import { useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { useTheme } from '../context/theme-context';
import { relativeTime } from '../lib/format';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { CardSkeletonList } from './ui/CardSkeleton';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import type { Notification, NotificationType } from '../types/database';

const TYPE_ICON: Record<NotificationType, IoniconsIconName> = {
  announcement: 'megaphone-outline',
  emergency: 'warning-outline',
  issue_status: 'build-outline',
  issue_reported: 'alert-circle-outline',
  visitor_pass_used: 'ticket-outline',
  join_request_approved: 'checkmark-circle-outline',
  staff_invite_accepted: 'person-add-outline',
  household_member_scanned: 'people-outline',
  order_placed: 'cart-outline',
  order_completed: 'checkmark-done-outline',
  transfer_confirmed: 'checkmark-circle-outline',
  transfer_rejected: 'close-circle-outline',
  listing_suspended: 'ban-outline',
  listing_reinstated: 'checkmark-circle-outline',
};

/** Same notifications inbox for every role — the table and its RLS (own rows only) don't distinguish who's looking, so neither does this screen. */
export function NotificationsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [markingAll, setMarkingAll] = useState(false);

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profile,
  });

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0;

  async function markRead(notification: Notification) {
    if (notification.read_at) return;
    queryClient.setQueryData<Notification[]>(['notifications', profile?.id], (prev) =>
      prev?.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notification.id);
    queryClient.invalidateQueries({ queryKey: ['notifications_unread', profile?.id] });
  }

  async function markAllRead() {
    if (!profile || unreadCount === 0) return;
    setMarkingAll(true);
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('profile_id', profile.id).is('read_at', null);
    setMarkingAll(false);
    queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications_unread', profile.id] });
  }

  const header = (
    <View
      style={{ paddingTop: insets.top + 16 }}
      className="flex-row items-center gap-md bg-white px-lg pb-lg dark:bg-ink-bg"
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
      >
        <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
      </Pressable>
      <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Notifications</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        {header}
        <CardSkeletonList />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      {header}
      <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        unreadCount > 0 ? (
          <Pressable
            onPress={markAllRead}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
            disabled={markingAll}
            className="mb-md items-end"
          >
            <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">
              {markingAll ? 'Marking…' : `Mark all ${unreadCount} as read`}
            </Text>
          </Pressable>
        ) : null
      }
      data={notifications ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="notifications-outline" color={colors.textMuted} size={26} />}
          title="Nothing yet"
          message="Announcements, issue updates, and visitor activity will show up here."
        />
      }
      renderItem={({ item }) => {
        const unread = !item.read_at;
        const isEmergency = item.type === 'emergency';
        return (
          <Pressable
            onPress={() => markRead(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <Card accent={isEmergency ? 'danger' : 'default'} className="flex-row items-start gap-md">
              <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-paper-100 dark:bg-ink-bg">
                <Ionicons name={TYPE_ICON[item.type]} color={colors.textMuted} size={18} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-xs">
                  {unread && <View className="h-2 w-2 rounded-full bg-brand-800 dark:bg-brand-300" />}
                  <Text
                    className={`flex-1 text-base ${unread ? 'font-bold' : 'font-semibold'} text-paper-900 dark:text-ink-text`}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">{item.body}</Text>
                <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {relativeTime(item.created_at)}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      }}
      />
    </View>
  );
}
