import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Dropdown field — tap to expand the option list directly below it, in
 * normal document flow. Deliberately not Overlay-based: Overlay's
 * `position: absolute; inset: 0` resolves against the nearest ancestor View,
 * which in a half-width flex row (e.g. Estate/Role side by side) is that
 * narrow column, not the screen — the backdrop and list end up clipped to
 * the field's own width instead of covering everything. Expanding inline
 * sidesteps that regardless of what row/column this is nested in.
 */
export function Select<T extends string>({
  label,
  showLabel = false,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  showLabel?: boolean;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className={`mb-lg ${className ?? ''}`}>
      {showLabel && (
        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">{label}</Text>
      )}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        className={`flex-row items-center justify-between border border-paper-200 bg-white px-lg py-[16px] dark:border-ink-border dark:bg-ink-surface ${
          open ? 'rounded-t-md border-b-0' : 'rounded-md'
        }`}
      >
        <Text className="text-[15px] text-paper-900 dark:text-ink-text">{selected?.label ?? 'Select'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {open && (
        <View className="rounded-b-md border border-t-0 border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface">
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
        </View>
      )}
    </View>
  );
}
