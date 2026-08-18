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
import { InviteStaffForm } from '../../components/admin/InviteStaffForm';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { Estate, Profile, StaffInvite } from '../../types/database';

type WithEstateName<T> = T & { estate: { name: string } | null };

export default function AdminStaffScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data: estate } = useQuery({
    queryKey: ['my_estate', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estates')
        .select('*')
        .eq('id', profile!.estate_id!)
        .single();
      if (error) throw error;
      return data as Estate;
    },
    enabled: !!profile?.estate_id,
  });

  // Only fetched for the picker inside InviteStaffForm — super_admin oversees
  // every estate and needs to choose which one a new hire belongs to, rather
  // than the invite silently landing in whichever estate happens to be their
  // own home one.
  const { data: estates } = useQuery({
    queryKey: ['all_estates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estates').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: isSuperAdmin,
  });

  const {
    data: invites,
    refetch: refetchInvites,
    isRefetching: isRefetchingInvites,
  } = useQuery({
    queryKey: ['staff_invites_pending', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_invites')
        .select('*, estate:estates(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WithEstateName<StaffInvite>[];
    },
    enabled: !!profile,
  });

  const {
    data: staff,
    refetch: refetchStaff,
    isRefetching: isRefetchingStaff,
  } = useQuery({
    queryKey: ['staff_members', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, estate:estates(name)')
        .in('role', ['security', 'admin'])
        .eq('approved', true)
        .order('full_name');
      if (error) throw error;
      return data as WithEstateName<Profile>[];
    },
    enabled: !!profile,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['staff_invites_pending', profile?.estate_id] });
    queryClient.invalidateQueries({ queryKey: ['staff_members', profile?.estate_id] });
  }

  async function onRefresh() {
    await Promise.all([refetchInvites(), refetchStaff()]);
  }

  async function revoke(inviteId: string) {
    setError(undefined);
    setRevokingId(inviteId);
    const { error } = await supabase.rpc('revoke_staff_invite', { invite_id: inviteId });
    setRevokingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    invalidate();
  }

  return (
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
      refreshControl={
        <RefreshControl
          refreshing={isRefetchingInvites || isRefetchingStaff}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      data={staff ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          {error && <Notice message={error} />}

          <InviteStaffForm
            estateName={estate?.name}
            estates={isSuperAdmin ? estates : undefined}
            onInvited={invalidate}
          />

          {invites && invites.length > 0 && (
            <>
              <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
                Pending invites ({invites.length})
              </Text>
              {invites.map((invite) => (
                <Card key={invite.id} className="mb-md flex-row items-center gap-md">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                      {invite.email}
                    </Text>
                    <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                      {invite.role} · code {invite.code}
                      {isSuperAdmin && invite.estate?.name ? ` · ${invite.estate.name}` : ''}
                    </Text>
                  </View>
                  <Button
                    label="Revoke"
                    variant="danger"
                    onPress={() => revoke(invite.id)}
                    loading={revokingId === invite.id}
                    disabled={revokingId !== null && revokingId !== invite.id}
                  />
                </Card>
              ))}
            </>
          )}

          <Text className="mb-md mt-xl text-lg font-semibold text-paper-900 dark:text-ink-text">
            Staff
          </Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="shield-outline" color={colors.textMuted} size={26} />}
          title="No staff yet"
          message="Security and admin accounts you invite will show up here."
        />
      }
      renderItem={({ item }) => (
        <Card className="mb-sm flex-row items-center gap-md">
          <Avatar uri={item.avatar_url} name={item.full_name} size={36} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              {item.full_name ?? item.phone ?? 'Unnamed'}
            </Text>
            <Text className="mt-0.5 text-[13px] capitalize text-paper-500 dark:text-ink-textMuted">
              {item.role}
              {isSuperAdmin && item.estate?.name ? ` · ${item.estate.name}` : ''}
            </Text>
          </View>
        </Card>
      )}
    />
  );
}
