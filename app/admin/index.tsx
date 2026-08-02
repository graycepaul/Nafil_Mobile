import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { SignOutButton } from '../../components/SignOutButton';
import { InviteStaffForm } from '../../components/admin/InviteStaffForm';
import type { Estate, JoinRequestWithApplicant, Profile } from '../../types/database';

export default function AdminResidentsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, typography } = useTheme();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string>();

  const { data: requests } = useQuery({
    queryKey: ['join_requests_pending', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estate_join_requests')
        .select('*, applicant:profiles!estate_join_requests_profile_id_fkey(full_name, phone, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as JoinRequestWithApplicant[];
    },
    enabled: !!profile,
  });

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

  const { data: residents } = useQuery({
    queryKey: ['residents_approved', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approved', true)
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
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

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl }}
      data={residents ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <SignOutButton />

          {formError && <Notice message={formError} />}

          <View style={{ marginTop: spacing.xl }}>
            <InviteStaffForm estateName={estate?.name} />
          </View>

          <Text
            style={[typography.subheading, { color: colors.text, marginBottom: spacing.md }]}
          >
            Pending requests {requests && requests.length > 0 ? `(${requests.length})` : ''}
          </Text>

          {(!requests || requests.length === 0) && (
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xl }]}>
              No join requests waiting on you.
            </Text>
          )}

          {requests?.map((req) => (
            <Card key={req.id} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar uri={req.applicant?.avatar_url} name={req.applicant?.full_name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>
                    {req.applicant?.full_name ?? 'Unnamed'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    Unit {req.unit_no}
                    {req.applicant?.phone ? ` · ${req.applicant.phone}` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <Button label="Approve" onPress={() => approve(req.id)} style={{ flex: 1 }} />
                <Button
                  label="Reject"
                  variant="secondary"
                  onPress={() => reject(req.id)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ))}

          <Text
            style={[typography.subheading, { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md }]}
          >
            Residents
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg }}>
          No approved residents yet.
        </Text>
      }
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
          <Avatar uri={item.avatar_url} name={item.full_name} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {item.full_name ?? item.phone ?? 'Unnamed'}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {item.role === 'resident' ? `Unit ${item.unit_no ?? '—'}` : item.role.replace('_', ' ')}
            </Text>
          </View>
        </Card>
      )}
    />
  );
}
