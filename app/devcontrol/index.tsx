import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { useDevControlStore } from '../../store/devcontrol-store';
import { useDevOverview } from '../../lib/devcontrol';
import { formatBytes, formatDay, formatDuration, roleLabel } from '../../lib/devcontrol-format';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatCardSkeleton } from '../../components/ui/StatCardSkeleton';
import { Notice } from '../../components/ui/Notice';
import { DevScopeBar } from '../../components/devcontrol/DevScopeBar';
import type { DevOverview } from '../../types/devcontrol';

const FEATURES: [string, string][] = [
  ['issues', 'Issues'],
  ['visitor_passes', 'Visitor passes'],
  ['visitor_check_ins', 'Gate check-ins'],
  ['announcements', 'Announcements'],
  ['listings', 'Listings'],
  ['wallet_transactions', 'Wallet transactions'],
];

function Bars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">No data yet.</Text>;
  }
  return (
    <View className="h-28 flex-row items-end gap-xs">
      {items.map((item) => (
        <View key={item.label} className="flex-1 items-center justify-end gap-[2px]">
          <Text className="text-[10px] text-paper-500 dark:text-ink-textMuted">{item.value}</Text>
          <View
            className="w-full rounded-t-[3px] bg-brand-600"
            style={{ height: Math.max(3, (item.value / max) * 70) }}
          />
          <Text numberOfLines={1} className="text-[9px] text-paper-500 dark:text-ink-textMuted">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Row({ label, values }: { label: string; values: (string | number)[] }) {
  return (
    <View className="flex-row items-center border-t border-paper-200 py-sm dark:border-ink-border">
      <Text className="flex-1 text-[13px] text-paper-900 dark:text-ink-text">{label}</Text>
      {values.map((v, i) => (
        <Text key={i} className="w-20 text-right text-[13px] text-paper-900 dark:text-ink-text">
          {v}
        </Text>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-lg">
      <Text className="mb-md text-base font-semibold text-paper-900 dark:text-ink-text">{title}</Text>
      {children}
    </Card>
  );
}

export default function DevOverviewScreen() {
  const { colors } = useTheme();
  const scope = useDevControlStore((s) => s.scope);
  const { data, isLoading, isRefetching, refetch, error } = useDevOverview();

  const note = data
    ? scope === 'live'
      ? `${data.other_scope.users} test accounts and ${data.other_scope.estates} test estate${data.other_scope.estates === 1 ? '' : 's'} excluded.`
      : 'Test accounts and demo estates only. Not counted in live figures.'
    : undefined;

  return (
    <ScrollView
      className="flex-1 bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <DevScopeBar note={note} />
      {error && <Notice message="Could not load the overview. Pull down to retry." />}
      {isLoading || !data ? (
        <View className="gap-md">
          <View className="flex-row gap-md">
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
          <View className="flex-row gap-md">
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
        </View>
      ) : (
        <Loaded data={data} />
      )}
    </ScrollView>
  );
}

function Loaded({ data }: { data: DevOverview }) {
  const { colors } = useTheme();
  const { users, usage, usage_30d: u30, system } = data;
  const icon = (name: 'people-outline' | 'person-add-outline' | 'pulse-outline' | 'calendar-outline') => (
    <Ionicons name={name} color={colors.primary} size={18} />
  );

  return (
    <>
      <View className="mb-md flex-row gap-md">
        <StatCard icon={icon('people-outline')} value={users.total} label={`${users.confirmed} confirmed`} />
        <StatCard icon={icon('person-add-outline')} value={users.new_7d} label={`New in 7 days (${users.new_30d} in 30)`} />
      </View>
      <View className="mb-lg flex-row gap-md">
        <StatCard icon={icon('pulse-outline')} value={users.active_24h} label={`Active 24h (${users.active_7d} in 7 days)`} />
        <StatCard icon={icon('calendar-outline')} value={users.active_30d} label={`Active 30 days of ${users.total}`} />
      </View>

      <Section title="Signups per week">
        <Bars items={data.signups_weekly.map((r) => ({ label: formatDay(r.week), value: r.count }))} />
      </Section>

      <Section title="Users by last sign-in day (30 days)">
        <Bars items={data.last_sign_ins_daily.map((r) => ({ label: formatDay(r.day), value: r.count }))} />
      </Section>

      <Section title="Feature usage">
        <View className="flex-row pb-xs">
          <Text className="flex-1 text-[12px] text-paper-500 dark:text-ink-textMuted">Feature</Text>
          <Text className="w-20 text-right text-[12px] text-paper-500 dark:text-ink-textMuted">All time</Text>
          <Text className="w-20 text-right text-[12px] text-paper-500 dark:text-ink-textMuted">30 days</Text>
        </View>
        {FEATURES.map(([key, label]) => (
          <Row key={key} label={label} values={[usage[key] ?? 0, u30[key] ?? 0]} />
        ))}
        <Text className="mt-sm text-[12px] text-paper-500 dark:text-ink-textMuted">
          {usage.issues_open} open issues, {usage.join_requests_pending} pending join requests
        </Text>
      </Section>

      <Section title="Users by role">
        <View className="flex-row pb-xs">
          <Text className="flex-1 text-[12px] text-paper-500 dark:text-ink-textMuted">Role</Text>
          <Text className="w-20 text-right text-[12px] text-paper-500 dark:text-ink-textMuted">Users</Text>
          <Text className="w-20 text-right text-[12px] text-paper-500 dark:text-ink-textMuted">Approved</Text>
        </View>
        {data.roles.map((r) => (
          <Row key={r.role} label={roleLabel(r.role)} values={[r.count, r.approved]} />
        ))}
      </Section>

      <Section title="System">
        <Row label="API uptime" values={[formatDuration(system.api_uptime_seconds)]} />
        <Row label="Database size" values={[formatBytes(system.db_size_bytes)]} />
        <Row label="DB connections" values={[system.db_connections]} />
        <Row label="Push tokens" values={[system.push_tokens]} />
        <Row label="Unread notifications" values={[system.notifications_unread]} />
      </Section>
    </>
  );
}
