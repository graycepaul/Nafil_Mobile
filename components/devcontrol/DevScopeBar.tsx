import { View, Text, Pressable } from 'react-native';
import { useDevControlStore } from '../../store/devcontrol-store';
import type { DevScope } from '../../types/devcontrol';

const OPTIONS: { value: DevScope; label: string }[] = [
  { value: 'live', label: 'Live data' },
  { value: 'test', label: 'Test data' },
];

/** Live/Test switch shown at the top of every devControl tab. `note` is the line under it (what is excluded, or a test-data warning). */
export function DevScopeBar({ note }: { note?: string }) {
  const scope = useDevControlStore((s) => s.scope);
  const setScope = useDevControlStore((s) => s.setScope);

  return (
    <View className="mb-lg">
      <View className="flex-row rounded-md bg-paper-100 p-[3px] dark:bg-ink-raised">
        {OPTIONS.map((option) => {
          const active = scope === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setScope(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-1 items-center rounded-[6px] py-sm ${
                active ? 'bg-white dark:bg-ink-surface' : ''
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  active ? 'text-paper-900 dark:text-ink-text' : 'text-paper-500 dark:text-ink-textMuted'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {note ? (
        <Text
          className={`mt-sm text-[12px] leading-[17px] ${
            scope === 'test' ? 'text-warning' : 'text-paper-500 dark:text-ink-textMuted'
          }`}
        >
          {note}
        </Text>
      ) : null}
    </View>
  );
}
