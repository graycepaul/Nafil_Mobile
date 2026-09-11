import { View, Text } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { ALERT_CATEGORIES } from '../AlertCategoryPicker';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import type { SecurityAlert } from '../../types/database';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ALERT_CATEGORIES.map((c) => [c.value, c.label])
);

/** One report from security, admin/super_admin-only - see
 * 0044_security_alerts_to_admin.sql. Admin decides separately whether it's
 * worth posting a real announcement about. */
export function SecurityAlertCard({
  alert,
  authorName,
  onMarkAddressed,
  onPostAnnouncement,
  markingAddressed,
}: {
  alert: SecurityAlert;
  authorName?: string;
  onMarkAddressed: () => void;
  onPostAnnouncement: () => void;
  markingAddressed: boolean;
}) {
  const { colors } = useTheme();
  const addressed = alert.status === 'addressed';

  return (
    <Card className="mb-md">
      <View className="flex-row items-start justify-between gap-md">
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-sm">
            <StatusBadge
              label={CATEGORY_LABEL[alert.category] ?? alert.category}
              tone="danger"
            />
            <StatusBadge
              label={addressed ? 'Addressed' : 'Open'}
              tone={addressed ? 'success' : 'warning'}
            />
          </View>
          <Text className="mt-sm text-base font-semibold text-paper-900 dark:text-ink-text">
            {alert.title}
          </Text>
          <Text className="mt-xs text-[14px] leading-[20px] text-paper-900 dark:text-ink-text">
            {alert.body}
          </Text>
          <Text className="mt-sm text-[12px] text-paper-500 dark:text-ink-textMuted">
            {authorName ? `${authorName} · ` : ''}
            {relativeTime(alert.created_at)}
          </Text>
        </View>
        <Ionicons name="shield-outline" size={20} color={colors.textMuted} />
      </View>

      <View className="mt-md flex-row gap-sm">
        <Button
          label="Post announcement"
          variant="secondary"
          onPress={onPostAnnouncement}
          className="flex-1"
        />
        {!addressed && (
          <Button
            label="Mark addressed"
            onPress={onMarkAddressed}
            loading={markingAddressed}
            className="flex-1"
          />
        )}
      </View>
    </Card>
  );
}
