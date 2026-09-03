import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Toast } from '../../components/ui/Toast';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { Skeleton } from '../../components/ui/Skeleton';
import { emergencyLabel } from '../../components/AnnouncementsFeed';
import type { Announcement } from '../../types/database';

type AnnouncementWithEstate = Announcement & { estate: { name: string } | null };

export default function AdminAnnouncementDetailScreen() {
  const { id, toast: toastTone, toastMsg } = useLocalSearchParams<{ id: string; toast?: string; toastMsg?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const isSuperAdmin = profile?.role === 'super_admin';
  // Read once on arrival — the toast is transient, it's fine if it wouldn't
  // replay on a later re-visit to this same URL (state resets per mount).
  const [toast] = useState(() =>
    toastTone && toastMsg ? { tone: toastTone as 'success' | 'error', message: toastMsg } : undefined
  );
  const [toastVisible, setToastVisible] = useState(!!toast);

  const { data: announcement, isLoading } = useQuery({
    queryKey: ['announcement_admin', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, estate:estates(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AnnouncementWithEstate;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <View style={{ paddingTop: insets.top + 16 }} className="flex-row items-center gap-md px-lg pb-lg">
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
          <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Announcement</Text>
        </View>
        <View className="gap-sm p-lg">
          <Skeleton className="h-6 w-3/4 rounded-sm" />
          <Skeleton className="mt-md h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-2/3 rounded-sm" />
        </View>
      </View>
    );
  }

  if (!announcement) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <Text className="text-paper-900 dark:text-ink-text">Announcement not found.</Text>
      </View>
    );
  }

  const isEmergency = announcement.severity === 'emergency';

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      {toast && toastVisible && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToastVisible(false)} />
      )}
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Announcement</Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        {announcement.photo_url && (
          <RemoteImage uri={announcement.photo_url} className="mb-lg h-56 w-full rounded-md" />
        )}
        {isEmergency && (
          <View className="mb-sm">
            <StatusBadge label={emergencyLabel(announcement.category)} tone="danger" />
          </View>
        )}
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">{announcement.title}</Text>
        <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
          {relativeTime(announcement.created_at)}
          {isSuperAdmin && announcement.estate?.name ? ` · ${announcement.estate.name}` : ''}
        </Text>
        <Text className="mt-lg text-[15px] leading-[22px] text-paper-900 dark:text-ink-text">
          {announcement.body}
        </Text>
      </ScrollView>
    </View>
  );
}
