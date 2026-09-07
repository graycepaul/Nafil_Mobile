import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { Overlay } from '../ui/Overlay';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { REJECTION_PRESETS } from '../../lib/join-request-rejection';

const PRESET_REASONS = REJECTION_PRESETS.map((p) => p.label);

const OTHER = 'Other';

/**
 * Rejecting a request used to just flip its status - the resident found out
 * nothing beyond "wasn't approved." This collects a reason first: a
 * multi-select of the reasons that come up most, plus a free-text "Other"
 * for anything else, joined into one string the resident's rejection
 * notification then shows verbatim.
 */
export function RejectReasonModal({
  visible,
  onDismiss,
  onConfirm,
  submitting,
}: {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState('');

  function toggle(reason: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason);
      else next.add(reason);
      return next;
    });
  }

  function reset() {
    setSelected(new Set());
    setOtherText('');
  }

  const otherChecked = selected.has(OTHER);
  const reasonParts = [...selected].filter((r) => r !== OTHER);
  if (otherChecked && otherText.trim()) reasonParts.push(otherText.trim());
  const canConfirm = reasonParts.length > 0;

  return (
    <Overlay
      visible={visible}
      onDismiss={() => {
        reset();
        onDismiss();
      }}
    >
      <Card className="bg-white p-lg dark:bg-ink-surface">
        <Text className="mb-xs text-lg font-semibold text-paper-900 dark:text-ink-text">
          Why is this request being rejected?
        </Text>
        <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
          The applicant will see this, so they know what to fix.
        </Text>

        <View className="gap-sm">
          {[...PRESET_REASONS, OTHER].map((reason) => {
            const active = selected.has(reason);
            return (
              <Pressable
                key={reason}
                onPress={() => toggle(reason)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                className="flex-row items-center gap-sm py-xs"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                    active
                      ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                      : 'border-paper-200 dark:border-ink-border'
                  }`}
                >
                  {active && <Ionicons name="checkmark" size={13} color={colors.onButtonFill} />}
                </View>
                <Text className="flex-1 text-[14px] text-paper-900 dark:text-ink-text">{reason}</Text>
              </Pressable>
            );
          })}
        </View>

        {otherChecked && (
          <View className="mt-sm">
            <Input
              placeholder="Describe the reason"
              value={otherText}
              onChangeText={setOtherText}
              multiline
            />
          </View>
        )}

        <View className="mt-md flex-row gap-sm">
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => {
              reset();
              onDismiss();
            }}
            className="flex-1"
          />
          <Button
            label="Reject"
            variant="secondary"
            disabled={!canConfirm}
            loading={submitting}
            onPress={() => {
              onConfirm(reasonParts.join('; '));
              reset();
            }}
            className="flex-1"
          />
        </View>
      </Card>
    </Overlay>
  );
}
