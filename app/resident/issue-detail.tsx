import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { DetailSkeleton } from '../../components/ui/DetailSkeleton';
import type { Issue, IssueStatus } from '../../types/database';

const STATUS_TONE: Record<IssueStatus, BadgeTone> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('issues').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Issue;
    },
    enabled: !!id,
  });

  const heroHeight = width * 0.75;

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <DetailSkeleton heroHeight={heroHeight} />
      </View>
    );
  }

  if (!issue) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <Text className="text-paper-900 dark:text-ink-text">Report not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <ScrollView contentContainerClassName="pb-xl" bounces={false}>
        <View>
          {issue.photo_urls.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {issue.photo_urls.map((url) => (
                <RemoteImage key={url} uri={url} style={{ width, height: heroHeight }} />
              ))}
            </ScrollView>
          ) : (
            <View
              style={{ height: heroHeight * 0.6 }}
              className="items-center justify-center bg-brand-50 dark:bg-brand-900"
            >
              <Ionicons name="build-outline" size={56} color={colors.primary} />
            </View>
          )}
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={{ top: insets.top + 12 }}
            className="absolute left-lg h-10 w-10 items-center justify-center rounded-full bg-black/40"
          >
            <Ionicons name="arrow-back" color="#fff" size={22} />
          </Pressable>
        </View>

        <View className="p-lg">
          <View className="mb-xs flex-row items-center justify-between gap-sm">
            <Text className="flex-1 text-[22px] font-bold text-paper-900 dark:text-ink-text">
              {issue.category}
            </Text>
            <StatusBadge label={STATUS_LABEL[issue.status]} tone={STATUS_TONE[issue.status]} />
          </View>
          <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">
            Reported {relativeTime(issue.created_at)}
            {issue.resolved_at ? ` · resolved ${relativeTime(issue.resolved_at)}` : ''}
          </Text>

          <Text className="mb-xs mt-lg text-base font-semibold text-paper-900 dark:text-ink-text">
            Description
          </Text>
          <Text className="text-[15px] leading-[22px] text-paper-900 dark:text-ink-text">
            {issue.description}
          </Text>

          {issue.photo_urls.length > 1 && (
            <>
              <Text className="mb-sm mt-lg text-base font-semibold text-paper-900 dark:text-ink-text">
                Photos ({issue.photo_urls.length})
              </Text>
              <View className="flex-row flex-wrap gap-sm">
                {issue.photo_urls.map((url) => (
                  <RemoteImage key={url} uri={url} className="h-20 w-20 rounded-md" />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
