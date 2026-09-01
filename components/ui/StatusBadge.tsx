import { View, Text } from "react-native";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<BadgeTone, { box: string; text: string }> = {
  neutral: {
    box: "bg-paper-50 dark:bg-ink-surface",
    text: "text-paper-500 dark:text-ink-textMuted",
  },
  success: {
    box: "bg-success-muted dark:bg-success-mutedDark",
    text: "text-success",
  },
  warning: {
    box: "bg-warning-muted dark:bg-warning-mutedDark",
    text: "text-warning",
  },
  danger: {
    box: "bg-danger-muted dark:bg-danger-mutedDark",
    text: "text-danger",
  },
  info: {
    box: "bg-brand-50 dark:bg-brand-900",
    text: "text-brand-800 dark:text-brand-300",
  },
};

/** Small colored pill for status words (pending, resolved, expired, emergency…). */
export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const { box, text } = TONE_CLASSES[tone];

  return (
    <View className={`self-start rounded-full px-[10px] py-[3px] ${box}`}>
      <Text
        className={`text-[10px] font-semibold uppercase tracking-[0.6px] ${text}`}
      >
        {label}
      </Text>
    </View>
  );
}
