import { View, Text } from 'react-native';
import { passwordStrength } from '../../lib/validation';

const TONE_CLASSES = { weak: 'bg-danger', fair: 'bg-warning', strong: 'bg-success' } as const;
const TEXT_CLASSES = { weak: 'text-danger', fair: 'text-warning', strong: 'text-success' } as const;

/** Three-segment strength hint. Advisory only — the enforced rule is minimum length. */
export function PasswordMeter({ password }: { password: string }) {
  const { level, label } = passwordStrength(password);
  const filled = { weak: 1, fair: 2, strong: 3 }[level];

  return (
    <View className="-mt-sm mb-lg">
      <View className="flex-row gap-xs">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={`h-[3px] flex-1 rounded-full ${
              i < filled ? TONE_CLASSES[level] : 'bg-paper-200 dark:bg-ink-border'
            }`}
          />
        ))}
      </View>
      <Text className={`mt-xs text-[13px] ${TEXT_CLASSES[level]}`}>{label}</Text>
    </View>
  );
}
