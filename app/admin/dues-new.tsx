import { createElement, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { Card } from '../../components/ui/Card';
import { Overlay } from '../../components/ui/Overlay';
import type { DueCategory, Profile } from '../../types/database';

const CATEGORIES: { value: DueCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'service_fee', label: 'Service fee' },
  { value: 'security', label: 'Security' },
];

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
}

export default function AssignDuesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<DueCategory>('general');
  const [dueDate, setDueDate] = useState<Date>(defaultDueDate);
  const [pendingDate, setPendingDate] = useState<Date>(defaultDueDate);
  const [webDate, setWebDate] = useState(() => defaultDueDate().toISOString().slice(0, 10));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const isWeb = Platform.OS === 'web';

  const { data: residents, isLoading } = useQuery({
    queryKey: ['residents_for_dues', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, unit_no')
        .eq('role', 'resident')
        .eq('approved', true)
        .order('full_name');
      if (error) throw error;
      return data as Pick<Profile, 'id' | 'full_name' | 'unit_no'>[];
    },
    enabled: !!profile,
  });

  const filteredResidents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return residents ?? [];
    return (residents ?? []).filter((r) => r.full_name?.toLowerCase().includes(q));
  }, [residents, search]);

  function toggleResident(id: string) {
    setAllSelected(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setAllSelected((prev) => !prev);
    setSelected(new Set());
  }

  const resolvedDate = isWeb ? (/^\d{4}-\d{2}-\d{2}$/.test(webDate) ? new Date(`${webDate}T00:00:00`) : null) : dueDate;
  const selectedCount = allSelected ? (residents ?? []).length : selected.size;
  const canSubmit = selectedCount > 0 && label.trim() && Number(amount) > 0 && !!resolvedDate;

  async function handleSubmit() {
    if (!canSubmit || !profile?.estate_id || !resolvedDate) return;
    setError(undefined);
    setSubmitting(true);
    const residentIds = allSelected ? (residents ?? []).map((r) => r.id) : [...selected];
    const { error: insertError } = await supabase.from('dues').insert(
      residentIds.map((residentId) => ({
        estate_id: profile.estate_id,
        profile_id: residentId,
        label: label.trim(),
        amount: Number(amount),
        due_date: resolvedDate.toISOString(),
        category,
      }))
    );
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['dues_admin', profile.estate_id] });
    router.replace('/admin/dues');
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable
          onPress={() => router.replace('/admin/dues')}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Assign a due</Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        {error && <Notice message={error} />}

        <Input
          label="Label"
          showLabel
          placeholder="e.g. October service charge"
          value={label}
          onChangeText={setLabel}
        />
        <Input
          label="Amount (₦)"
          showLabel
          placeholder="e.g. 15000"
          keyboardType="number-pad"
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
        />

        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">Category</Text>
        <View className="mb-lg flex-row flex-wrap gap-sm">
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <Pressable
                key={c.value}
                onPress={() => setCategory(c.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`rounded-full border px-md py-sm ${
                  active
                    ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                    : 'border-paper-200 dark:border-ink-border'
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    active ? 'text-white dark:text-ink-bg' : 'text-paper-900 dark:text-ink-text'
                  }`}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">Due date</Text>
        {isWeb ? (
          <View className="mb-lg">
            {createElement('input', {
              type: 'date',
              value: webDate,
              min: new Date().toISOString().slice(0, 10),
              onChange: (e: { target: { value: string } }) => setWebDate(e.target.value),
              style: {
                width: '100%',
                boxSizing: 'border-box',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: colors.border,
                borderRadius: 8,
                padding: 14,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.inputBg,
                cursor: 'pointer',
              },
            })}
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setPendingDate(dueDate);
              setShowDatePicker(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Change due date"
            className="mb-lg flex-row items-center justify-between rounded-md border border-paper-200 px-md py-md active:opacity-80 dark:border-ink-border"
          >
            <Text className="text-base text-paper-900 dark:text-ink-text">
              {dueDate.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </Pressable>
        )}

        {!isWeb && (
          <Overlay visible={showDatePicker} onDismiss={() => setShowDatePicker(false)}>
            <Card className="bg-white p-lg dark:bg-ink-surface">
              <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">Select due date</Text>
              <DateTimePicker
                value={pendingDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event, selectedValue) => {
                  if (event.type === 'dismissed' || !selectedValue) return;
                  setPendingDate(selectedValue);
                }}
              />
              <View className="mt-md flex-row gap-sm">
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setShowDatePicker(false)}
                  className="flex-1"
                />
                <Button
                  label="Done"
                  onPress={() => {
                    setDueDate(pendingDate);
                    setShowDatePicker(false);
                  }}
                  className="flex-1"
                />
              </View>
            </Card>
          </Overlay>
        )}

        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
          Assign to ({selectedCount} selected)
        </Text>
        <Pressable
          onPress={toggleAll}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allSelected }}
          className={`mb-sm flex-row items-center gap-md rounded-md border p-md ${
            allSelected
              ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-bg'
              : 'border-paper-200 dark:border-ink-border'
          }`}
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
              allSelected
                ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                : 'border-paper-200 dark:border-ink-border'
            }`}
          >
            {allSelected && <Ionicons name="checkmark" size={13} color={colors.onButtonFill} />}
          </View>
          <Text className="flex-1 text-base font-semibold text-paper-900 dark:text-ink-text">
            All residents ({(residents ?? []).length})
          </Text>
        </Pressable>

        <Input placeholder="Search residents by name" value={search} onChangeText={setSearch} />

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View className="gap-xs">
            {filteredResidents.map((item) => {
              const checked = allSelected || selected.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleResident(item.id)}
                  disabled={allSelected}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  className="flex-row items-center gap-md rounded-md border border-paper-200 p-md dark:border-ink-border"
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                      checked
                        ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                        : 'border-paper-200 dark:border-ink-border'
                    }`}
                  >
                    {checked && <Ionicons name="checkmark" size={13} color={colors.onButtonFill} />}
                  </View>
                  <Text className="flex-1 text-base text-paper-900 dark:text-ink-text">
                    {item.full_name ?? 'Unnamed'}
                    {item.unit_no ? ` · Unit ${item.unit_no}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Button
          label="Assign due"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
          className="mt-lg"
        />
      </ScrollView>
    </View>
  );
}
