import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { JoinRequestWithApplicant, Profile } from '../../types/database';

type WithEstateName<T> = T & { estate: { name: string } | null };
type ResidentsTab = 'all' | 'pending';

export default function AdminResidentsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { tab: openOnLoad } = useLocalSearchParams<{ tab?: string }>();
  const [formError, setFormError] = useState<string>();
  const [activeTab, setActiveTab] = useState<ResidentsTab>('all');
  const [search, setSearch] = useState('');
  const isSuperAdmin = profile?.role === 'super_admin';

  // Deep-linked from the Dashboard's "Pending requests" stat card.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openOnLoad === 'pending') setActiveTab('pending');
  }, [openOnLoad]);


  const {
    data: requests,
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
    isRefetching: isRefetchingRequests,
  } = useQuery({
    queryKey: ['join_requests_pending', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estate_join_requests')
        .select(
          '*, applicant:profiles!estate_join_requests_profile_id_fkey(full_name, phone, avatar_url), estate:estates(name)'
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as WithEstateName<JoinRequestWithApplicant>[];
    },
    enabled: !!profile,
  });

  const {
    data: residents,
    isLoading: isLoadingResidents,
    refetch: refetchResidents,
    isRefetching: isRefetchingResidents,
  } = useQuery({
    queryKey: ['residents_approved', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, estate:estates(name)')
        .eq('role', 'resident')
        .eq('approved', true)
        .order('full_name');
      if (error) throw error;
      return data as WithEstateName<Profile>[];
    },
    enabled: !!profile,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['join_requests_pending', profile?.estate_id] });
    queryClient.invalidateQueries({ queryKey: ['residents_approved', profile?.estate_id] });
  }

  async function approve(requestId: string) {
    setFormError(undefined);
    const { error } = await supabase.rpc('approve_join_request', { request_id: requestId });
    if (error) setFormError(error.message);
    else invalidate();
  }

  async function reject(requestId: string) {
    setFormError(undefined);
    const { error } = await supabase.rpc('reject_join_request', { request_id: requestId });
    if (error) setFormError(error.message);
    else invalidate();
  }

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requests ?? []).filter((req) => {
      if (q && !req.applicant?.full_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [requests, search]);

  const filteredResidents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (residents ?? []).filter((r) => {
      if (q && !r.full_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [residents, search]);

  const pendingCount = requests?.length ?? 0;

  if (isLoadingRequests || isLoadingResidents) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <CardSkeletonList media />
      </View>
    );
  }

  const searchFilter = (
    <View className="pt-lg">
      <SearchAndEstateFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by name"
      />
    </View>
  );

  const tabs = (
    <View className="flex-row border-b border-paper-200 dark:border-ink-border">
      {(
        [
          { key: 'all' as const, label: 'All residents' },
          { key: 'pending' as const, label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ]
      ).map((t) => {
        const active = activeTab === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center border-b-2 pb-sm ${
              active ? 'border-brand-800 dark:border-brand-300' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-[14px] font-semibold ${
                active ? 'text-brand-800 dark:text-brand-300' : 'text-paper-500 dark:text-ink-textMuted'
              }`}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (activeTab === 'pending') {
    return (
      <FlatList
        className="bg-white dark:bg-ink-bg"
        contentContainerClassName="px-xl pb-xl"
        refreshControl={
          <RefreshControl refreshing={isRefetchingRequests} onRefresh={refetchRequests} tintColor={colors.primary} />
        }
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {searchFilter}
            {tabs}
            <View className="h-lg" />
            {formError && <Notice message={formError} />}
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="All caught up" message="No join requests waiting on you." />
        }
        renderItem={({ item: req }) => (
          <Card className="mb-md">
            <View className="flex-row items-center gap-md">
              <Avatar uri={req.applicant?.avatar_url} name={req.applicant?.full_name} size={44} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {req.applicant?.full_name ?? 'Unnamed'}
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  Unit {req.unit_no}
                  {req.applicant?.phone ? ` · ${req.applicant.phone}` : ''}
                  {isSuperAdmin && req.estate?.name ? ` · ${req.estate.name}` : ''}
                </Text>
              </View>
            </View>
            <View className="mt-md flex-row gap-sm">
              <Button label="Approve" onPress={() => approve(req.id)} className="flex-1" />
              <Button label="Reject" variant="secondary" onPress={() => reject(req.id)} className="flex-1" />
            </View>
          </Card>
        )}
      />
    );
  }

  return (
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="px-xl pb-xl"
      refreshControl={
        <RefreshControl refreshing={isRefetchingResidents} onRefresh={refetchResidents} tintColor={colors.primary} />
      }
      data={filteredResidents}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          {searchFilter}
          {tabs}
          <View className="h-lg" />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="person-outline" color={colors.textMuted} size={26} />}
          title="No approved residents yet"
          message="Approved residents in your estate will show up here."
        />
      }
      renderItem={({ item }) => (
        <Card className="mb-sm flex-row items-center gap-md">
          <Avatar uri={item.avatar_url} name={item.full_name} size={36} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              {item.full_name ?? item.phone ?? 'Unnamed'}
            </Text>
            <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
              Unit {item.unit_no ?? 'N/A'}
              {isSuperAdmin && item.estate?.name ? ` · ${item.estate.name}` : ''}
            </Text>
          </View>
        </Card>
      )}
    />
  );
}
