import { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { useDevControlStore } from '../../store/devcontrol-store';
import { useDevEstates, useSetTestFlag } from '../../lib/devcontrol';
import { friendlyDbError } from '../../lib/db-errors';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import { DevScopeBar } from '../../components/devcontrol/DevScopeBar';
import { FlagButton } from '../../components/devcontrol/FlagButton';
import type { DevEstate } from '../../types/devcontrol';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="mr-lg">
      <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{value}</Text>
      <Text className="text-[11px] text-paper-500 dark:text-ink-textMuted">{label}</Text>
    </View>
  );
}

export default function DevEstatesScreen() {
  const { colors } = useTheme();
  const scope = useDevControlStore((s) => s.scope);
  const { data, isLoading, isRefetching, refetch, error } = useDevEstates();
  const setFlag = useSetTestFlag();
  const [pending, setPending] = useState<DevEstate | null>(null);
  const [saving, setSaving] = useState(false);
  const [flagError, setFlagError] = useState<string>();

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    setFlagError(undefined);
    try {
      await setFlag('estate', pending.id, scope === 'live');
      setPending(null);
    } catch (err) {
      setFlagError(friendlyDbError(err));
      setPending(null);
    }
    setSaving(false);
  }

  const toTest = scope === 'live';

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <FlatList
        contentContainerClassName="p-lg"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <DevScopeBar />
            {(error || flagError) && (
              <Notice message={flagError ?? 'Could not load estates. Pull down to retry.'} />
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <CardSkeletonList />
          ) : (
            <EmptyState
              icon={<Ionicons name="business-outline" color={colors.textMuted} size={26} />}
              title="No estates here"
              message={scope === 'live' ? 'No live estates.' : 'No test estates.'}
            />
          )
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-start justify-between gap-md">
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{item.name}</Text>
                <Text className="mt-0.5 text-[12px] text-paper-500 dark:text-ink-textMuted">
                  Created{' '}
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <FlagButton scope={scope} source={item.test_source} onPress={() => setPending(item)} />
            </View>
            <View className="mt-md flex-row flex-wrap gap-y-sm">
              <Stat label="Members" value={item.members} />
              <Stat label="Approved" value={item.approved_members} />
              <Stat label="Issues" value={item.issues} />
              <Stat label="Passes" value={item.visitor_passes} />
              <Stat label="Announcements" value={item.announcements} />
              <Stat label="Listings" value={item.listings} />
              <Stat label="Pending requests" value={item.pending_requests} />
            </View>
          </Card>
        )}
      />

      <ConfirmDialog
        visible={!!pending}
        title={toTest ? 'Mark estate as test?' : 'Move estate to live?'}
        message={
          pending
            ? toTest
              ? `${pending.name} and everyone in it will be excluded from live figures.`
              : `${pending.name} and everyone in it will count as live again.`
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
