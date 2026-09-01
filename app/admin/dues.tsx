import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import type { Due, DueCategory, DueStatus, Profile } from '../../types/database';

const STATUS_TONE: Record<DueStatus, BadgeTone> = {
  due: 'info',
  overdue: 'danger',
  paid: 'success',
};

const STATUS_FILTERS: { value: DueStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All statuses' },
  { value: 'due', label: 'Due' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
];

const CATEGORY_FILTERS: { value: DueCategory | undefined; label: string }[] = [
  { value: undefined, label: 'All categories' },
  { value: 'general', label: 'General' },
  { value: 'service_fee', label: 'Service fee' },
  { value: 'security', label: 'Security' },
];

type DueWithResident = Due & { resident: Pick<Profile, 'full_name' | 'unit_no'> | null };

/** finance/super_admin only — dues_insert's RLS check does the same role and estate scoping server-side. */
export default function AdminDuesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DueStatus>();
  const [categoryFilter, setCategoryFilter] = useState<DueCategory>();

  const { data: dues, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dues_admin', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dues')
        .select('*, resident:profiles(full_name, unit_no)')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data as DueWithResident[];
    },
    enabled: !!profile,
  });

  const filteredDues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (dues ?? []).filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (q && !item.label.toLowerCase().includes(q) && !item.resident?.full_name?.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [dues, search, statusFilter, categoryFilter]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center justify-between px-lg pb-lg"
      >
        <View className="flex-row items-center gap-md">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
            <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
          </Pressable>
          <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Estate dues</Text>
        </View>
        <Pressable
          onPress={() => router.push('/admin/dues-new')}
          accessibilityRole="button"
          accessibilityLabel="Assign dues"
          hitSlop={8}
        >
          <Ionicons name="add" color={colors.onHeaderBg} size={24} />
        </Pressable>
      </View>

      <FlatList
        className="bg-white dark:bg-ink-bg"
        contentContainerClassName="p-xl"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <SearchAndEstateFilter
              search={search}
              onSearchChange={setSearch}
              placeholder="Search by label or resident"
            />
            <View className="mb-md flex-row flex-wrap gap-sm">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => setStatusFilter(f.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`rounded-full border px-md py-xs ${
                      active
                        ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                        : 'border-paper-200 dark:border-ink-border'
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-medium ${
                        active ? 'text-white dark:text-ink-bg' : 'text-paper-500 dark:text-ink-textMuted'
                      }`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mb-lg flex-row flex-wrap gap-sm">
              {CATEGORY_FILTERS.map((f) => {
                const active = categoryFilter === f.value;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => setCategoryFilter(f.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`rounded-full border px-md py-xs ${
                      active
                        ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                        : 'border-paper-200 dark:border-ink-border'
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-medium ${
                        active ? 'text-white dark:text-ink-bg' : 'text-paper-500 dark:text-ink-textMuted'
                      }`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        data={filteredDues}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="receipt-outline" color={colors.textMuted} size={26} />}
            title="No dues match"
            message="Tap + to charge residents a service charge, levy, or other estate fee, or adjust your filters."
          />
        }
        renderItem={({ item }) => (
          <Card className="mb-sm flex-row items-center gap-sm">
            <View className="flex-1">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{item.label}</Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                {item.resident?.full_name ?? 'Unknown resident'}
                {item.resident?.unit_no ? ` · Unit ${item.resident.unit_no}` : ''}
              </Text>
              <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                Due{' '}
                {new Date(item.due_date).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {' · '}
                {relativeTime(item.created_at)}
              </Text>
            </View>
            <View className="items-end gap-xs">
              <Text className="text-[15px] font-bold text-paper-900 dark:text-ink-text">
                {formatNaira(item.amount)}
              </Text>
              <StatusBadge label={item.status} tone={STATUS_TONE[item.status]} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}
