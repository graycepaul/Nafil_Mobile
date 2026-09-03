import { useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
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

const NEXT_STATUS: Record<IssueStatus, IssueStatus | null> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: null,
};

type IssueWithContext = Issue & {
  reporter: { full_name: string | null; unit_no: string | null } | null;
  estate: { name: string } | null;
};

export default function AdminIssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string>();

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue_admin', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*, reporter:profiles!issues_resident_id_fkey(full_name, unit_no), estate:estates(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as IssueWithContext;
    },
    enabled: !!id,
  });

  async function advance() {
    if (!issue) return;
    const next = NEXT_STATUS[issue.status];
    if (!next) return;
    setError(undefined);
    setAdvancing(true);
    const { error } = await supabase
      .from('issues')
      .update({
        status: next,
        resolved_at: next === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', issue.id);
    setAdvancing(false);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['issue_admin', id] });
    queryClient.invalidateQueries({ queryKey: ['issues_admin', profile?.estate_id] });
  }

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
  const next = NEXT_STATUS[issue.status];

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
          {error && <Notice message={error} />}
          <View className="mb-xs flex-row items-center justify-between gap-sm">
            <Text className="flex-1 text-[22px] font-bold text-paper-900 dark:text-ink-text">
              {issue.category}
            </Text>
            <StatusBadge label={STATUS_LABEL[issue.status]} tone={STATUS_TONE[issue.status]} />
          </View>
          <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">
            Reported by {issue.reporter?.full_name ?? 'Unknown resident'}
            {issue.reporter?.unit_no ? ` · Unit ${issue.reporter.unit_no}` : ''}
            {isSuperAdmin && issue.estate?.name ? ` · ${issue.estate.name}` : ''}
          </Text>
          <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
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

          {next && (
            <Button
              label={`Mark ${next.replace('_', ' ')}`}
              onPress={advance}
              loading={advancing}
              className="mt-lg"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
