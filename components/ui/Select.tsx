import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Dropdown field — tap to expand the option list as a floating overlay
 * directly below it. Positioned `absolute` relative to this component's own
 * wrapper (not Overlay's full-screen `inset-0`, which resolves against the
 * nearest ancestor and would clip to a half-width column in a side-by-side
 * row), so opening it never shifts any field below — it was previously
 * expanding inline in document flow, pushing every field after it down the
 * screen for as long as it stayed open.
 */
export function Select<T extends string>({
  label,
  showLabel = false,
  value,
  options,
  onChange,
  error,
  className,
  isOpen,
  onToggle,
}: {
  label: string;
  showLabel?: boolean;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  className?: string;
  /**
   * Controlled open state, for a group of Selects that must stay mutually
   * exclusive (e.g. country + state side by side) — without this, each
   * Select only knows about its own open/closed state, so opening one next
   * to an already-open one leaves both open at once. Omit both props for
   * the normal uncontrolled behavior (its own internal open state).
   */
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  const { colors } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;
  const setOpen = onToggle ?? setInternalOpen;
  const selected = options.find((o) => o.value === value);

  return (
    <View className={`relative z-10 mb-lg ${className ?? ''}`}>
      {showLabel && (
        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">{label}</Text>
      )}
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        className={`flex-row items-center justify-between rounded-md border bg-white px-lg py-[16px] dark:bg-ink-surface ${
          error ? 'border-danger' : 'border-paper-200 dark:border-ink-border'
        }`}
      >
        <Text className="text-[15px] text-paper-900 dark:text-ink-text">{selected?.label ?? 'Select'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {error && (
        <Text className="mt-xs text-[13px] text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      {open && (
        <View className="absolute inset-x-0 top-full z-20 mt-xs max-h-[240px] overflow-hidden rounded-md border border-paper-200 bg-white shadow-lg dark:border-ink-border dark:bg-ink-surface">
          <ScrollView keyboardShouldPersistTaps="handled">
            {options.map((option, index) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`flex-row items-center justify-between px-lg py-md ${
                    index === 0 ? '' : 'border-t border-paper-100 dark:border-ink-border'
                  }`}
                >
                  <Text
                    className={`text-[15px] ${
                      active ? 'font-semibold text-brand-800 dark:text-brand-300' : 'text-paper-900 dark:text-ink-text'
                    }`}
                  >
                    {option.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
