import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth-store";
import { useTheme } from "../../context/theme-context";
import { relativeTime } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { emergencyLabel } from "../../components/AnnouncementsFeed";
import type { Announcement, Estate } from "../../types/database";

export default function ResidentHome() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: estate } = useQuery({
    queryKey: ["my_estate", profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estates")
        .select("*")
        .eq("id", profile!.estate_id!)
        .single();
      if (error) throw error;
      return data as Estate;
    },
    enabled: !!profile?.estate_id,
  });

  const { data: activePassCount } = useQuery({
    queryKey: ["dashboard_active_passes", profile?.id],
    queryFn: async () => {
      // status='pending' alone overcounts: nothing flips it to 'expired'
      // automatically (that job isn't deployed), so a lapsed pass still reads
      // 'pending' in the DB. Excluding by valid_until keeps this number honest.
      const { count } = await supabase
        .from("visitor_passes")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .gt("valid_until", new Date().toISOString());
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: openIssueCount } = useQuery({
    queryKey: ["dashboard_open_issues", profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]);
      return count ?? 0;
    },
    enabled: !!profile,
  });

  const { data: recentAnnouncements } = useQuery({
    queryKey: ["dashboard_recent_announcements", profile?.estate_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      return (data ?? []) as Announcement[];
    },
    enabled: !!profile,
  });

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: ["dashboard_active_passes"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard_open_issues"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard_recent_announcements"],
    });
    setRefreshing(false);
  }

  return (
    <ScrollView
      className="flex-1 bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* ── Welcome card ─────────────────────────────────────────── */}
      <Card className="mb-lg">
        <View className="flex-row items-center gap-md">
          <Avatar
            uri={profile?.avatar_url}
            name={profile?.full_name}
            size={56}
          />
          <View className="flex-1">
            <Text className="text-[22px] font-bold tracking-[-0.2px] text-paper-900 dark:text-ink-text">
              {profile?.full_name ?? "Welcome Again"}
            </Text>
            <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
              {estate?.name ?? "...fetching estate"}
              {profile?.unit_no ? ` · Unit ${profile.unit_no}` : ""}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-md mt-lg">
          <Pressable
            onPress={() => router.push("/resident/visitor-pass?new=1")}
            className="flex-1 items-center rounded-md bg-brand-800 py-md active:opacity-90 dark:bg-brand-500"
          >
            <Text className="text-base font-semibold text-white">
              + Visitor pass
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/resident/issues?new=1")}
            className="flex-1 items-center rounded-md border border-paper-200 bg-paper-50 py-md active:opacity-80 dark:border-ink-border dark:bg-ink-surface"
          >
            <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
              Report issue
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* ── Quick stats ──────────────────────────────────────────── */}
      <View className="mb-lg flex-row gap-md">
        <StatCard
          icon={<Ionicons name="ticket-outline" color={colors.primary} size={18} />}
          value={activePassCount ?? 0}
          label="Active passes"
          onPress={() => router.push("/resident/visitor-pass")}
        />
        <StatCard
          icon={<Ionicons name="build-outline" color={colors.primary} size={18} />}
          value={openIssueCount ?? 0}
          label="Open issues"
          onPress={() => router.push("/resident/issues")}
        />
      </View>

      {/* ── Quick actions ────────────────────────────────────────── */}

      {/* ── Recent announcements ─────────────────────────────────── */}
      <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">
        Latest announcements
      </Text>
      {recentAnnouncements && recentAnnouncements.length > 0 ? (
        <View className="gap-md">
          {recentAnnouncements.map((announcement) => (
            <Pressable
              key={announcement.id}
              onPress={() => router.push("/resident/announcements")}
            >
              <Card
                accent={
                  announcement.severity === "emergency" ? "danger" : "default"
                }
              >
                <View className="flex-row items-start gap-sm">
                  <View className="h-8 w-8 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                    <Ionicons name="megaphone-outline" color={colors.primary} size={16} />
                  </View>
                  <View className="flex-1">
                    {announcement.severity === "emergency" && (
                      <View className="mb-xs">
                        <StatusBadge label={emergencyLabel(announcement.category)} tone="danger" />
                      </View>
                    )}
                    <Text
                      className="text-base font-semibold text-paper-900 dark:text-ink-text"
                      numberOfLines={1}
                    >
                      {announcement.title}
                    </Text>
                    <Text
                      className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted"
                      numberOfLines={2}
                    >
                      {announcement.body}
                    </Text>
                    <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                      {relativeTime(announcement.created_at)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" color={colors.textMuted} size={18} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <EmptyState
            icon={<Ionicons name="megaphone-outline" color={colors.textMuted} size={26} />}
            title="No announcements yet"
            message="Estate-wide updates will show up here."
          />
        </Card>
      )}
    </ScrollView>
  );
}
