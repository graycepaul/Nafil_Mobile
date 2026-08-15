import { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { sharePass } from '../../lib/share-pass';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { expiryLabel, titleCase } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { VisitorPass, VisitorPassStatus } from '../../types/database';

const STATUS_TONE: Record<VisitorPassStatus, BadgeTone> = {
  pending: 'info',
  used: 'success',
  expired: 'neutral',
  revoked: 'danger',
};

export default function VisitorPassScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { new: openOnLoad } = useLocalSearchParams<{ new?: string }>();
  // Open by default — generating a pass is this screen's primary action, and
  // starting on a closed form just makes the resident tap + before they can
  // do anything. They can still collapse it via the header toggle.
  const [formOpen, setFormOpen] = useState(true);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<VisitorPass | null>(null);
  const [formError, setFormError] = useState<string>();
  const [formNotice, setFormNotice] = useState<string>();

  const { data: estate } = useQuery({
    queryKey: ['my_estate', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estates')
        .select('name')
        .eq('id', profile!.estate_id!)
        .single();
      if (error) throw error;
      return data as { name: string };
    },
    enabled: !!profile?.estate_id,
  });

  // Deep-linked from Home's "+ Visitor pass" quick action (?new=1) — opens
  // straight to the form instead of landing on a closed tab the user then
  // has to tap again. Stays an effect (not derived at render) because it
  // must re-open the form on a repeat deep link even after the resident has
  // since closed it via the header toggle.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openOnLoad) setFormOpen(true);
  }, [openOnLoad]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setFormOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={formOpen ? 'Close form' : 'Generate pass'}
          hitSlop={8}
          className="px-lg"
        >
          <View style={{ transform: [{ rotate: formOpen ? '45deg' : '0deg' }] }}>
            <Ionicons name="add" color={colors.onHeaderBg} size={24} />
          </View>
        </Pressable>
      ),
    });
  }, [navigation, formOpen, colors.onHeaderBg]);

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
      visitor_name: titleCase(visitorName),
      visitor_phone: visitorPhone.trim() || null,
    });
    setCreating(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setVisitorName('');
    setVisitorPhone('');
    setFormOpen(false);
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
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        className="bg-white dark:bg-ink-bg"
        contentContainerClassName="p-xl"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {formOpen && (
              <Card className="mb-lg">
                {formError && <Notice message={formError} />}
                {formNotice && <Notice tone="success" message={formNotice} />}
                <Input
                  label="Visitor name"
                  showLabel
                  placeholder="e.g. Ade Johnson"
                  value={visitorName}
                  onChangeText={setVisitorName}
                />
                <Input
                  label="Visitor phone (optional)"
                  showLabel
                  placeholder="e.g. 0803 123 4567"
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
              </Card>
            )}
            <Text className="mb-sm text-lg font-semibold text-paper-900 dark:text-ink-text">
              Your passes
            </Text>
          </View>
        }
        data={passes ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="ticket-outline" color={colors.textMuted} size={26} />}
            title="No passes yet"
            message="Tap + up top to generate one and share the code with your visitor."
          />
        }
        renderItem={({ item }) => {
          // The DB's `status` only flips to 'expired' via a scheduled job that
          // isn't deployed yet — so a pass past its window still reads 'pending'
          // here. Compute the effective state client-side rather than show a
          // "Pending" badge next to "Expired 2h ago", which reads as contradictory.
          // Security enforces the real window at check-in regardless of this.
          // eslint-disable-next-line react-hooks/purity
          const isLapsed = item.status === 'pending' && new Date(item.valid_until).getTime() < Date.now();
          const isActionable = item.status === 'pending' && !isLapsed;

          return (
            <Card>
              <View className="flex-row items-center gap-lg">
                <View className="rounded-[4px] bg-white p-xs">
                  <QRCode value={item.code} size={72} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                    {titleCase(item.visitor_name)}
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                    Code: {item.code}
                  </Text>
                  <View className="mt-xs flex-row items-center gap-sm">
                    <StatusBadge
                      label={isLapsed ? 'expired' : item.status}
                      tone={isLapsed ? 'neutral' : STATUS_TONE[item.status]}
                    />
                    {item.status === 'pending' && (
                      <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">
                        {expiryLabel(item.valid_until)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              {isActionable && (
                <View className="mt-md flex-row gap-sm">
                  <Button
                    label="Share with visitor"
                    variant="secondary"
                    onPress={async () => {
                      const outcome = await sharePass(item, estate?.name);
                      if (outcome === 'copied') {
                        setFormNotice('Copied. Paste it into WhatsApp.');
                      }
                    }}
                    className="flex-1"
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
            ? `${titleCase(pendingRevoke.visitor_name)}'s code (${pendingRevoke.code}) will stop working immediately.`
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
