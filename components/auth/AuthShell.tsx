import type { ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/theme-context";
import { BrandLockup } from "../ui/BrandMark";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}

/**
 * Shared frame for the auth screens: centred brand mark, left-aligned heading,
 * then the form. Deliberately light and airy — no gradient hero — so the form
 * itself is the focus.
 *
 * The whole block is vertically centred in the viewport (`justifyContent: 'center'`
 * on a `flexGrow` scroll container) rather than top-anchored with the footer pinned
 * to the bottom edge. Top-anchoring reads fine on a tall form but leaves a dead gap
 * in the middle of short ones (login, forgot-password) — centring keeps whitespace
 * even above and below regardless of how much content is on screen, and still
 * scrolls normally once content exceeds the viewport (role-select, signup).
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  onBack,
}: AuthShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow justify-center px-xl"
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <View className="w-full max-w-[420px] self-center">
            {onBack && (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                className="mb-lg self-start active:opacity-50"
              >
                <Ionicons name="arrow-back" color={colors.primary} size={24} />
              </Pressable>
            )}

            <View className="items-center">
              <BrandLockup size="sm" />
            </View>

            <Text className="mb-xl mt-2xl text-lg font-semibold text-paper-900 dark:text-ink-text">
              {title}
            </Text>

            {subtitle && (
              <Text className="-mt-md mb-xl text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
                {subtitle}
              </Text>
            )}

            {children}

            {footer && <View className="mt-2xl">{footer}</View>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Inline text link, used in auth footers. */
export function AuthLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} className="active:opacity-60">
      <Text className="text-sm font-semibold text-brand-800 dark:text-brand-300">{label}</Text>
    </Pressable>
  );
}
