import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { sharePass } from '../../lib/share-pass';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { expiryLabel } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TicketIcon } from '../../components/ui/icons';
import type { VisitorPass, VisitorPassStatus } from '../../types/database';

const STATUS_TONE: Record<VisitorPassStatus, BadgeTone> = {
  pending: 'info',
  used: 'success',
  expired: 'neutral',
  revoked: 'danger',
};

export default function VisitorPassScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, typography } = useTheme();
  const queryClient = useQueryClient();
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<VisitorPass | null>(null);
  const [formError, setFormError] = useState<string>();
  const [formNotice, setFormNotice] = useState<string>();

  const { data: passes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['visitor_passes', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_passes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as VisitorPass[];
    },
    enabled: !!profile,
  });

  async function createPass() {
    if (!visitorName.trim() || !profile?.estate_id) return;
    setFormError(undefined);
    setCreating(true);
    const { error } = await supabase.from('visitor_passes').insert({
      estate_id: profile.estate_id,
      resident_id: profile.id,
      visitor_name: visitorName.trim(),
      visitor_phone: visitorPhone.trim() || null,
    });
    setCreating(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setVisitorName('');
    setVisitorPhone('');
    queryClient.invalidateQueries({ queryKey: ['visitor_passes', profile.id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_active_passes'] });
  }

  async function revokePass() {
    if (!pendingRevoke) return;
    const id = pendingRevoke.id;
    setRevokingId(id);
    const { error } = await supabase.from('visitor_passes').update({ status: 'revoked' }).eq('id', id);
    setRevokingId(null);
    setPendingRevoke(null);
    if (error) {
      setFormError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['visitor_passes', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_active_passes'] });
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.xl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {formError && <Notice message={formError} />}
            {formNotice && <Notice tone="success" message={formNotice} />}
            <Input label="Visitor name" value={visitorName} onChangeText={setVisitorName} />
            <Input
              label="Visitor phone (optional)"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
              keyboardType="phone-pad"
            />
            <Button
              label="Generate pass"
              onPress={createPass}
              loading={creating}
              disabled={!visitorName.trim()}
            />
            <Text
              style={[
                typography.subheading,
                { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
              ]}
            >
              Your passes
            </Text>
          </View>
        }
        data={passes ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={<TicketIcon color={colors.textMuted} size={26} />}
            title="No passes yet"
            message="Generate one above and share the code with your visitor."
          />
        }
        renderItem={({ item }) => {
          // The DB's `status` only flips to 'expired' via a scheduled job that
          // isn't deployed yet — so a pass past its window still reads 'pending'
          // here. Compute the effective state client-side rather than show a
          // "Pending" badge next to "Expired 2h ago", which reads as contradictory.
          // Security enforces the real window at check-in regardless of this.
          const isLapsed = item.status === 'pending' && new Date(item.valid_until).getTime() < Date.now();
          const isActionable = item.status === 'pending' && !isLapsed;

          return (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <View style={{ backgroundColor: '#fff', padding: spacing.xs, borderRadius: 4 }}>
                  <QRCode value={item.code} size={72} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {item.visitor_name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    Code: {item.code}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
                    <StatusBadge
                      label={isLapsed ? 'expired' : item.status}
                      tone={isLapsed ? 'neutral' : STATUS_TONE[item.status]}
                    />
                    {item.status === 'pending' && (
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {expiryLabel(item.valid_until)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              {isActionable && (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    label="Share with visitor"
                    variant="secondary"
                    onPress={async () => {
                      const outcome = await sharePass(item);
                      if (outcome === 'copied') {
                        setFormNotice('Copied — paste it into WhatsApp.');
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    loading={revokingId === item.id}
                    onPress={() => setPendingRevoke(item)}
                  />
                </View>
              )}
            </Card>
          );
        }}
      />

      <ConfirmDialog
        visible={!!pendingRevoke}
        title="Cancel this pass?"
        message={
          pendingRevoke
            ? `${pendingRevoke.visitor_name}'s code (${pendingRevoke.code}) will stop working immediately.`
            : undefined
        }
        confirmLabel="Cancel pass"
        cancelLabel="Keep pass"
        destructive
        loading={!!revokingId}
        onConfirm={revokePass}
        onCancel={() => setPendingRevoke(null)}
      />
    </>
  );
}
