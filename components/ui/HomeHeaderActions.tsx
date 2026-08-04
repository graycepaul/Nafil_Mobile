import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/theme-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";

/** Home tab's header-right row: notifications, support, settings — the only tab that gets all three. */
export function HomeHeaderActions() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-md">
      <Pressable
        onPress={() => router.push("/resident/announcements")}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={8}
      >
        <Ionicons
          name="notifications-outline"
          size={20}
          color={colors.onHeaderBg}
        />
      </Pressable>
      <Pressable
        onPress={() => router.push("/support")}
        accessibilityRole="button"
        accessibilityLabel="Support"
        hitSlop={8}
      >
        <Ionicons name="headset-outline" size={20} color={colors.onHeaderBg} />
      </Pressable>
      <Pressable
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
      >
        <Ionicons name="settings-outline" size={20} color={colors.onHeaderBg} />
      </Pressable>
    </View>
  );
}
