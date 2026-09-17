import { useState } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { friendlyDbError } from '../../lib/db-errors';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { Overlay } from '../../components/ui/Overlay';
import { Select } from '../../components/ui/Select';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import type { EstatePayoutAccount, PaymentPurpose } from '../../types/database';

const PURPOSES: { value: PaymentPurpose; label: string; hint: string }[] = [
  { value: 'wallet_topup', label: 'Wallet top-up', hint: 'Where a resident funding their wallet pays.' },
  { value: 'general', label: 'Estate dues (general)', hint: 'The default account for "Dues".' },
  { value: 'service_fee', label: 'Service fee', hint: 'Dues charged under the service fee category.' },
  { value: 'security', label: 'Security', hint: 'Dues charged under the security category.' },
];

const NEW_ACCOUNT = '__new__';

type SettingRow = { purpose: PaymentPurpose; account_id: string };

/**
 * Where each estate's incoming bank transfers actually land - previously a
 * single hardcoded account shared by every estate on the platform (see
 * 0054_configurable_payment_accounts_and_financials.sql). super_admin only:
 * this money is the estate's own, unlike a marketplace listing's payout
 * account, which belongs to whichever resident is selling.
 */
export default function PaymentSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [editingPurpose, setEditingPurpose] = useState<PaymentPurpose | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['payout_accounts', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estate_payout_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EstatePayoutAccount[];
    },
    enabled: !!profile,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['payment_settings', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('estate_payment_settings').select('purpose, account_id');
      if (error) throw error;
      return data as SettingRow[];
    },
    enabled: !!profile,
  });

  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));
  const accountByPurpose = new Map(
    (settings ?? []).map((s) => [s.purpose, accountById.get(s.account_id)] as const)
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['payout_accounts', profile?.estate_id] });
    queryClient.invalidateQueries({ queryKey: ['payment_settings', profile?.estate_id] });
    queryClient.invalidateQueries({ queryKey: ['payment_accounts'] });
  }

  function openEditor(purpose: PaymentPurpose) {
    const current = accountByPurpose.get(purpose);
    setEditingPurpose(purpose);
    setSelectedAccountId(current?.id ?? NEW_ACCOUNT);
    setNewAccountName(current?.account_name ?? '');
    setNewAccountNumber(current?.account_number ?? '');
    setNewBankName(current?.bank_name ?? '');
    setError(undefined);
  }

  const usingNewAccount = selectedAccountId === NEW_ACCOUNT || !accounts || accounts.length === 0;
  const canSave = usingNewAccount
    ? newAccountName.trim() && newAccountNumber.trim() && newBankName.trim()
    : !!selectedAccountId;

  async function handleSave() {
    if (!editingPurpose || !canSave || !profile?.estate_id) return;
    setError(undefined);
    setSaving(true);

    let accountId = selectedAccountId;
    if (usingNewAccount) {
      const { data: account, error: accountErr } = await supabase
        .from('estate_payout_accounts')
        .upsert(
          {
            estate_id: profile.estate_id,
            account_name: newAccountName.trim(),
            account_number: newAccountNumber.trim(),
            bank_name: newBankName.trim(),
          },
          { onConflict: 'estate_id,account_number,bank_name' }
        )
        .select()
        .single();
      if (accountErr) {
        setError(friendlyDbError(accountErr));
        setSaving(false);
        return;
      }
      accountId = account.id;
    }

    const { error: settingErr } = await supabase.from('estate_payment_settings').upsert(
      {
        estate_id: profile.estate_id,
        purpose: editingPurpose,
        account_id: accountId,
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'estate_id,purpose' }
    );
    setSaving(false);
    if (settingErr) {
      setError(friendlyDbError(settingErr));
      return;
    }
    invalidate();
    setEditingPurpose(null);
  }

  const isLoading = accountsLoading || settingsLoading;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-ink-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Payment accounts</Text>
      </View>

      {isLoading ? (
        <CardSkeletonList />
      ) : (
        <ScrollView contentContainerClassName="p-lg">
          <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
            Set which of your estate&apos;s accounts each kind of payment lands in. Residents see these details
            when they pay by bank transfer.
          </Text>

          {PURPOSES.map((p) => {
            const account = accountByPurpose.get(p.value);
            return (
              <Pressable
                key={p.value}
                onPress={() => openEditor(p.value)}
                accessibilityRole="button"
                className="mb-md rounded-md border border-paper-200 p-md active:opacity-80 dark:border-ink-border"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{p.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">{p.hint}</Text>
                {account ? (
                  <Text className="mt-sm text-[13px] text-paper-900 dark:text-ink-text">
                    {account.account_name} · {account.account_number} · {account.bank_name}
                  </Text>
                ) : (
                  <Text className="mt-sm text-[13px] font-semibold text-warning">Not set up yet</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Overlay visible={!!editingPurpose} onDismiss={() => setEditingPurpose(null)}>
        <Card className="bg-white p-lg dark:bg-ink-surface">
          <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
            {PURPOSES.find((p) => p.value === editingPurpose)?.label}
          </Text>

          {error && <Notice message={error} />}

          {accounts && accounts.length > 0 && (
            <Select
              label="Account"
              showLabel
              value={selectedAccountId || NEW_ACCOUNT}
              onChange={setSelectedAccountId}
              options={[
                { value: NEW_ACCOUNT, label: '+ Add a new account' },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: `${a.account_name} · ${a.account_number} · ${a.bank_name}`,
                })),
              ]}
            />
          )}

          {usingNewAccount && (
            <>
              <Input
                label="Account name"
                showLabel
                placeholder="e.g. Nafil Gardens Estate"
                value={newAccountName}
                onChangeText={setNewAccountName}
              />
              <Input
                label="Account number"
                showLabel
                placeholder="e.g. 0123456789"
                keyboardType="number-pad"
                value={newAccountNumber}
                onChangeText={(v) => setNewAccountNumber(v.replace(/[^0-9]/g, ''))}
              />
              <Input
                label="Bank"
                showLabel
                placeholder="e.g. Providus Bank"
                value={newBankName}
                onChangeText={setNewBankName}
              />
            </>
          )}

          <View className="flex-row gap-sm">
            <Button label="Cancel" variant="ghost" onPress={() => setEditingPurpose(null)} className="flex-1" />
            <Button label="Save" onPress={handleSave} loading={saving} disabled={!canSave} className="flex-1" />
          </View>
        </Card>
      </Overlay>
    </KeyboardAvoidingView>
  );
}
