import { useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { useDevControlStore } from '../../store/devcontrol-store';
import { useDevUsers, useSetTestFlag } from '../../lib/devcontrol';
import { friendlyDbError } from '../../lib/db-errors';
import { formatDay, roleLabel } from '../../lib/devcontrol-format';
import { relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import { DevScopeBar } from '../../components/devcontrol/DevScopeBar';
import { FlagButton } from '../../components/devcontrol/FlagButton';
import type { DevUser } from '../../types/devcontrol';

export default function DevUsersScreen() {
  const { colors } = useTheme();
  const scope = useDevControlStore((s) => s.scope);
  const { data, isLoading, isRefetching, refetch, error } = useDevUsers();
  const setFlag = useSetTestFlag();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<DevUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [flagError, setFlagError] = useState<string>();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((u) =>
      [u.full_name, u.email, u.role, u.estate].some((v) => v?.toLowerCase().includes(q))
    );
  }, [data, query]);

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    setFlagError(undefined);
    try {
      await setFlag('user', pending.id, scope === 'live');
      setPending(null);
    } catch (err) {
      setFlagError(friendlyDbError(err));
      setPending(null);
    }
    setSaving(false);
  }

  const toTest = scope === 'live';
  const label = (u: DevUser) => u.email ?? u.full_name ?? 'this account';

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <FlatList
        contentContainerClassName="p-lg"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <DevScopeBar />
            {(error || flagError) && (
              <Notice message={flagError ?? 'Could not load users. Pull down to retry.'} />
            )}
            <Input
              placeholder="Search name, email, role or estate"
              autoCapitalize="none"
              autoCorrect={false}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <CardSkeletonList />
          ) : (
            <EmptyState
              icon={<Ionicons name="people-outline" color={colors.textMuted} size={26} />}
              title="No users match"
              message={query ? 'Try a different search.' : 'Nobody in this view yet.'}
            />
          )
        }
        ListFooterComponent={
          filtered.length > 0 ? (
            <Text className="mt-xs text-center text-[12px] text-paper-500 dark:text-ink-textMuted">
              Showing {filtered.length} of {data?.length ?? 0}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-start justify-between gap-md">
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {item.full_name ?? 'Unnamed'}
                </Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {item.email ?? 'No email'}
                </Text>
              </View>
              <FlagButton scope={scope} source={item.test_source} onPress={() => setPending(item)} />
            </View>
            <View className="mt-sm flex-row flex-wrap items-center gap-sm">
              <StatusBadge label={roleLabel(item.role)} tone="info" />
              <StatusBadge label={item.approved ? 'Approved' : 'Not approved'} tone={item.approved ? 'success' : 'warning'} />
              {item.estate ? <StatusBadge label={item.estate} tone="neutral" /> : null}
            </View>
            <Text className="mt-sm text-[12px] text-paper-500 dark:text-ink-textMuted">
              Joined {formatDay(item.created_at)} · Last sign-in{' '}
              {item.last_sign_in_at ? relativeTime(item.last_sign_in_at) : 'never'}
            </Text>
          </Card>
        )}
      />

      <ConfirmDialog
        visible={!!pending}
        title={toTest ? 'Mark account as test?' : 'Move account to live?'}
        message={
          pending
            ? toTest
              ? `${label(pending)} will be excluded from live figures.`
              : `${label(pending)} will count as live again.`
            : undefined
        }
        confirmLabel={toTest ? 'Mark as test' : 'Move to live'}
        loading={saving}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}
