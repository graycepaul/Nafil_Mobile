import { useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Card } from '../../components/ui/Card';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import { Ionicons } from '@react-native-vector-icons/ionicons';
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

type IssueWithContext = Issue & {
  reporter: { full_name: string | null; unit_no: string | null } | null;
  estate: { name: string } | null;
};

export default function AdminIssuesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data: issues, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['issues_admin', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*, reporter:profiles!issues_resident_id_fkey(full_name, unit_no), estate:estates(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as IssueWithContext[];
    },
    enabled: !!profile,
  });

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (issues ?? []).filter((issue) => {
      if (
        q &&
        !issue.category.toLowerCase().includes(q) &&
        !issue.description.toLowerCase().includes(q) &&
        !issue.reporter?.full_name?.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [issues, search]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <CardSkeletonList media />
      </View>
    );
  }

  return (
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <SearchAndEstateFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by category, description, or reporter"
        />
      }
      data={filteredIssues}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="build-outline" color={colors.textMuted} size={26} />}
          title="No issues reported"
          message="Issues residents report will show up here."
        />
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/admin/issue-detail?id=${item.id}`)}>
          <Card className="flex-row gap-md">
            {item.photo_urls[0] && (
              <RemoteImage uri={item.photo_urls[0]} className="h-16 w-16 rounded-md" />
            )}
            <View className="flex-1">
              <View className="flex-row items-start justify-between gap-sm">
                <Text className="flex-1 text-base font-semibold text-paper-900 dark:text-ink-text">
                  {item.category}
                </Text>
                <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
              </View>
              <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted" numberOfLines={1}>
                {item.description}
              </Text>
              <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
                {item.reporter?.full_name ?? 'Unknown resident'}
                {item.reporter?.unit_no ? ` · Unit ${item.reporter.unit_no}` : ''}
                {isSuperAdmin && item.estate?.name ? ` · ${item.estate.name}` : ''}
              </Text>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}
