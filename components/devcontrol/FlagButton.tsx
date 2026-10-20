import { Text, Pressable } from 'react-native';
import type { DevScope, TestSource } from '../../types/devcontrol';

/**
 * Small action on a user or estate row. Rule-matched entries (a @nafil.test
 * email, Demo Gardens, dev admins) are test by definition and cannot be moved
 * from here, so they show "Auto" instead of a button.
 */
export function FlagButton({
  scope,
  source,
  onPress,
}: {
  scope: DevScope;
  source: TestSource;
  onPress: () => void;
}) {
  if (source === 'rule') {
    return <Text className="text-[12px] text-paper-400 dark:text-ink-textMuted">Auto</Text>;
  }

  const label = scope === 'live' ? 'Mark as test' : 'Move to live';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="rounded-md border border-paper-200 px-md py-xs active:opacity-70 dark:border-ink-border"
    >
      <Text className="text-[12px] font-semibold text-brand-800 dark:text-brand-300">{label}</Text>
    </Pressable>
  );
}
