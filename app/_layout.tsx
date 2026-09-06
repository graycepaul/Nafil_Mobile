import "../global.css";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../context/theme-context";
import { useAuthStore } from "../store/auth-store";
import { supabase } from "../lib/supabase";
import {
  establishSessionFromUrl,
  urlLooksLikeAuthLink,
} from "../lib/auth-session";
import { registerForPushNotifications } from "../lib/push-notifications";
import { AppShell } from "../components/ui/AppShell";
import type { UserRole } from "../types/database";

const queryClient = new QueryClient();

const ROLE_HOME: Record<UserRole, string> = {
  resident: "/resident",
  security: "/security",
  admin: "/admin",
  super_admin: "/admin",
  finance: "/admin",
};

// Only these roles have a dedicated notifications list today — security
// falls back to its home screen rather than a route that doesn't exist yet.
const ROLE_NOTIFICATIONS: Partial<Record<UserRole, string>> = {
  resident: "/resident/notifications",
  admin: "/admin/notifications",
  super_admin: "/admin/notifications",
  finance: "/admin/notifications",
};

const AUTH_GROUP = "(auth)";
const ONBOARDING_GROUP = "(onboarding)";
// Shared across every role (theme, sign-out) — not nested under any role's
// section, so it needs its own exemption from the "must be on your own role's
// home section" redirect below, the same way the auth-group exceptions work.
const SHARED_ROUTES = new Set(["settings", "support"]);
// Reachable even when a session already exists — a fresh password-reset/invite
// link establishes a session, and the usual "session exists → go to role home"
// redirect below would otherwise bounce the user away before they can set a
// password.
const AUTH_GROUP_EXCEPTIONS = new Set(["set-password"]);

/**
 * Native deep links (password reset, staff invite) land here as a raw URL string
 * via `Linking`, not as a browser URL the Supabase client can auto-parse — so we
 * extract the session tokens by hand. Web doesn't need this: `detectSessionInUrl`
 * (see `lib/supabase.ts`) handles the equivalent case when the app loads directly
 * from the emailed link.
 */
function useNativeAuthLinks() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    function handleUrl(url: string | null) {
      if (!url || !urlLooksLikeAuthLink(url)) return;
      establishSessionFromUrl(url);
      // No explicit navigation here: expo-router's own linking integration
      // already routes to the path portion of this URL (e.g. `/set-password`).
      // This just makes sure a session exists by the time that screen mounts.
    }

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) =>
      handleUrl(url),
    );
    return () => subscription.remove();
  }, []);
}

/**
 * Keeps the app icon's badge count equal to the real unread-notifications
 * count, not the OS default of "+1 per push received" — that drifts the
 * moment a notification is read in-app rather than tapped from the shade.
 * Shares the same query key as the header bell dots, so this doesn't add a
 * second poll, it's the same cached/polled request.
 */
function useBadgeSync(profileId: string | undefined) {
  const { data: unreadCount } = useQuery({
    queryKey: ["notifications_unread", profileId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profileId && Platform.OS !== "web",
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setBadgeCountAsync(unreadCount ?? 0);
  }, [unreadCount]);
}

/**
 * Without these, a push sitting in the OS notification shade is a dead end —
 * nothing in the app reacts to it arriving or being tapped. On receipt (app
 * foregrounded), refresh the unread count so the badge/bell dot update
 * immediately instead of waiting for the next 30s poll. On tap, route
 * somewhere useful: an emergency alert to the home screen (where the banner
 * lives), everything else to that role's notifications list.
 */
function useNotificationRouting(
  role: UserRole | undefined,
  router: ReturnType<typeof useRouter>
) {
  useEffect(() => {
    if (Platform.OS === "web") return;

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications_unread"] });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { kind?: string }
          | undefined;
        if (data?.kind === "emergency_alert") {
          if (role) router.push(ROLE_HOME[role] as never);
          return;
        }
        const notificationsPath = role ? ROLE_NOTIFICATIONS[role] : undefined;
        if (notificationsPath) router.push(notificationsPath as never);
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [role, router]);
}

function RootNavigation() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const init = useAuthStore((s) => s.init);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => init(), [init]);
  useNativeAuthLinks();
  useBadgeSync(profile?.id);
  useNotificationRouting(profile?.role, router);

  // Registering as early as sign-in (rather than waiting for a specific
  // screen) means a resident's device is reachable for an emergency alert
  // from the moment they're part of an estate, not just once they happen to
  // visit some particular tab. estate_id gates it — a token registered
  // before a resident has one would just be unfindable by /alerts/broadcast,
  // which looks up recipients by estate.
  useEffect(() => {
    if (profile?.id && profile.estate_id) {
      registerForPushNotifications(profile.id);
    }
  }, [profile?.id, profile?.estate_id]);

  useEffect(() => {
    if (loading) return;

    const segmentList = segments as readonly string[];
    const section = segmentList[0];
    const subroute = segmentList[1];
    const inAuthGroup = section === AUTH_GROUP;
    const isExemptAuthRoute =
      inAuthGroup &&
      subroute !== undefined &&
      AUTH_GROUP_EXCEPTIONS.has(subroute);

    if (isExemptAuthRoute) return;

    if (!session) {
      // Signed out: let them move freely between login / signup / reset screens.
      if (!inAuthGroup) router.replace("/login");
      return;
    }

    if (!profile) return; // session known, profile still loading

    // Unapproved residents are ALWAYS confined to the onboarding wizard — this is
    // the actual fix for "signs up and lands in an empty dashboard." It's checked
    // before the normal role-home routing below and overrides it unconditionally,
    // so there's no route (typed in the URL bar, deep-linked, whatever) that gets
    // an unapproved resident into the resident tabs. RLS backs this up at the data
    // layer, but the redirect is what keeps the UI from ever rendering an
    // estate-less, nothing-loads dashboard in the first place.
    const needsOnboarding = profile.role === "resident" && !profile.approved;
    if (needsOnboarding) {
      if (section !== ONBOARDING_GROUP) router.replace("/onboarding");
      return;
    }

    if (section !== undefined && SHARED_ROUTES.has(section)) return;

    const homePath = ROLE_HOME[profile.role];
    const isOnOwnSection = section === homePath.slice(1);

    if (
      inAuthGroup ||
      section === ONBOARDING_GROUP ||
      !section ||
      !isOnOwnSection
    ) {
      router.replace(homePath as never);
    }
  }, [session, profile, loading, segments, router]);

  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigation />
          <ThemedStatusBar />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
