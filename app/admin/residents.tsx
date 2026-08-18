import { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { JoinRequestWithApplicant, Profile } from '../../types/database';

type WithEstateName<T> = T & { estate: { name: string } | null };

export default function AdminResidentsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string>();
  const isSuperAdmin = profile?.role === 'super_admin';

  const {
    data: requests,
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

  async function onRefresh() {
    await Promise.all([refetchRequests(), refetchResidents()]);
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

  return (
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
      refreshControl={
        <RefreshControl
          refreshing={isRefetchingRequests || isRefetchingResidents}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      data={residents ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          {formError && <Notice message={formError} />}

          <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
            Pending requests {requests && requests.length > 0 ? `(${requests.length})` : ''}
          </Text>

          {(!requests || requests.length === 0) && (
            <View className="mb-lg">
              <EmptyState title="All caught up" message="No join requests waiting on you." />
            </View>
          )}

          {requests?.map((req) => (
            <Card key={req.id} className="mb-md">
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
                <Button
                  label="Reject"
                  variant="secondary"
                  onPress={() => reject(req.id)}
                  className="flex-1"
                />
              </View>
            </Card>
          ))}

          <Text className="mb-md mt-xl text-lg font-semibold text-paper-900 dark:text-ink-text">
            Residents
          </Text>
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
