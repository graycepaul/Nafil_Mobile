import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../../context/theme-context";
import { formatNaira } from "../../lib/format";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge } from "../ui/StatusBadge";
import { PaymentMethodSheet, type PaymentMethod } from "./PaymentMethodSheet";
import type { DueItem } from "./marketplace-mock";

/**
 * Two-step dues payment: pick which line items to settle, then pick how to
 * pay for the sum of just those. Kept as one component (rather than two
 * separate overlay states in the screen) so the running total and the
 * selection live together.
 */
export function DuesPaymentFlow({
  items,
  walletBalance,
  onConfirm,
  onCancel,
}: {
  /** Unpaid items only. Paid ones aren't shown here. */
  items: DueItem[];
  walletBalance: number;
  onConfirm: (
    selectedIds: string[],
    method: PaymentMethod,
  ) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"select" | "pay">("select");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = items
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + item.amount, 0);

  if (items.length === 0) {
    return (
      <Card className="bg-white p-lg dark:bg-ink-surface">
        <EmptyState
          icon={
            <Ionicons
              name="checkmark-circle-outline"
              color={colors.success}
              size={26}
            />
          }
          title="All caught up"
          message="You have no outstanding estate dues right now."
        />
        <Button
          label="Close"
          variant="ghost"
          onPress={onCancel}
          className="mt-md"
        />
      </Card>
    );
  }

  if (step === "pay") {
    return (
      <PaymentMethodSheet
        title="Pay estate dues"
        amount={total}
        methods={["wallet", "card", "transfer"]}
        walletBalance={walletBalance}
        onConfirm={(method) => onConfirm([...selected], method)}
        onCancel={() => setStep("select")}
      />
    );
  }

  return (
    <Card className="bg-white p-lg dark:bg-ink-surface">
      <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
        Select dues to pay
      </Text>

      <View className="mb-lg gap-sm">
        {items.map((item) => {
          const active = selected.has(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              className={`flex-row items-start gap-md rounded-md border p-md active:opacity-80 min-h-[70px]  ${
                active
                  ? "border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-bg"
                  : "border-paper-200 bg-paper-50 dark:border-ink-border dark:bg-ink-surface"
              }`}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border-[1.5px] mt-1 ${
                  active
                    ? "border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300"
                    : "border-paper-200 dark:border-ink-border"
                }`}
              >
                {active && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={colors.onButtonFill}
                  />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-paper-900 dark:text-ink-text">
                  {item.label}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-sm">
                  <Text className="text-[11px] text-paper-500 dark:text-ink-textMuted">
                    Due{" "}
                    {new Date(item.dueDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                  {item.status === "overdue" && (
                    <StatusBadge label="Overdue" tone="danger" />
                  )}
                </View>
              </View>
              <Text className="text-[15px] font-semibold text-paper-900 dark:text-ink-text">
                {formatNaira(item.amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mb-lg flex-row items-center justify-between border-t border-paper-200 pt-md dark:border-ink-border">
        <Text className="text-base text-paper-900 dark:text-ink-text">
          Total
        </Text>
        <Text className="text-xl font-bold text-paper-900 dark:text-ink-text">
          {formatNaira(total)}
        </Text>
      </View>

      <View className="flex-row gap-sm">
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          className="flex-1"
        />
        <Button
          label="Continue"
          onPress={() => setStep("pay")}
          disabled={selected.size === 0}
          className="flex-1"
        />
      </View>
    </Card>
  );
}
