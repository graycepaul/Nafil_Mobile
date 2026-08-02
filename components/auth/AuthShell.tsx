import type { ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/theme-context";
import { BrandLockup } from "../ui/BrandMark";

function BackArrow({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5m0 0 6-6m-6 6 6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
  const { colors, spacing, typography, layout } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.xl,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: layout.authMaxWidth,
              alignSelf: "center",
            }}
          >
            {onBack && (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.5 : 1,
                  alignSelf: "flex-start",
                  marginBottom: spacing.lg,
                })}
              >
                <BackArrow color={colors.primary} />
              </Pressable>
            )}

            <View style={{ alignItems: "center" }}>
              <BrandLockup size="sm" />
            </View>

            <Text
              style={[
                typography.subheading,
                {
                  color: colors.text,
                  marginTop: spacing["2xl"],
                  marginBottom: spacing.xl,
                },
              ]}
            >
              {title}
            </Text>

            {subtitle && (
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textMuted,
                    marginTop: -spacing.md,
                    marginBottom: spacing.xl,
                    lineHeight: 19,
                  },
                ]}
              >
                {subtitle}
              </Text>
            )}

            {children}

            {footer && (
              <View style={{ marginTop: spacing["2xl"] }}>{footer}</View>
            )}
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
  const { colors, typography } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text
        style={[typography.label, { color: colors.primary, fontWeight: "600" }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
