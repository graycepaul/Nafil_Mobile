import "../global.css";
import "../lib/nativewind-interop";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../context/theme-context";
import { useAuthStore } from "../store/auth-store";
import { supabase } from "../lib/supabase";
import { establishSessionFromUrl, urlLooksLikeAuthLink } from "../lib/auth-session";
import { shouldApplyAuthLink } from "../lib/auth-link";
import {
  registerForPushNotifications,
  subscribeToPushTokenChanges,
} from "../lib/push-notifications";
import { AppShell } from "../components/ui/AppShell";
import { EmergencyAlertModal } from "../components/EmergencyAlertModal";
import { useEmergencyAlertStore } from "../store/emergency-alert-store";
import { useAppVersionGate } from "../lib/use-app-version-gate";
import { UpdateRequiredScreen } from "../components/UpdateRequiredScreen";
import { UpdateAvailableModal } from "../components/UpdateAvailableModal";
import { ProfileLoadError } from "../components/ProfileLoadError";
import type { UserRole } from "../types/database";
import { ROLE_HOME, notificationTapPath } from "../lib/role-routes";

const AUTH_GROUP = "(auth)";
const ONBOARDING_GROUP = "(onboarding)";
// Shared across every role (theme, sign-out) - not nested under any role's
// section, so it needs its own exemption from the "must be on your own role's
// home section" redirect below, the same way the auth-group exceptions work.
const SHARED_ROUTES = new Set(["settings", "support"]);
// Reachable even when a session already exists - a fresh password-reset/invite
// link establishes a session, and the usual "session exists → go to role home"
// redirect below would otherwise bounce the user away before they can set a
// password.
// household-invite creates the account and links it to the household in two
// steps a moment apart; without this the unapproved-resident redirect would
// pull the person off the screen between the two.
const AUTH_GROUP_EXCEPTIONS = new Set(["set-password", "household-invite"]);

/**
 * Native deep links (password reset, staff invite) land here as a raw URL string
 * via `Linking`, not as a browser URL the Supabase client can auto-parse - so we
 * extract the session tokens by hand. Web doesn't need this: `detectSessionInUrl`
 * (see `lib/supabase.ts`) handles the equivalent case when the app loads directly
 * from the emailed link.
 */
function useNativeAuthLinks() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    function handleUrl(url: string | null) {
      if (!url || !urlLooksLikeAuthLink(url)) return;
      if (!shouldApplyAuthLink(url, useAuthStore.getState().session?.user.id)) return;
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
 * count, not the OS default of "+1 per push received" - that drifts the
 * moment a notification is read in-app rather than tapped from the shade.
 * Shares the same query key as the header bell dots, so this doesn't add a
 * second poll, it's the same cached/polled request.
 */
/**
 * Registering as early as sign-in (rather than waiting for a specific
 * screen) means a device is reachable from the moment someone signs in, not
 * just once they happen to visit some particular tab. That includes a resident
 * whose estate request is still pending: without a token they would never get
 * the "approved" or "declined" push. A token with no estate is harmless to
 * everything else, because /alerts/broadcast finds recipients through their
 * profile's estate, so it simply isn't found until they have one.
 *
 * Two things a one-shot effect misses, handled here: if the resident denies
 * the permission prompt and later grants it from Settings, nothing would
 * otherwise retry - this re-attempts registration every time the app
 * returns to the foreground, which is idempotent (an already-registered
 * device just re-upserts the same token). And a token can rotate under a
 * live session (reinstall, restored backup) - subscribeToPushTokenChanges
 * keeps that in sync for as long as this profile stays signed in.
 */
function usePushRegistration(profileId: string | undefined) {
  useEffect(() => {
    if (!profileId) return;

    registerForPushNotifications(profileId);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") registerForPushNotifications(profileId);
    });
    const tokenSub = subscribeToPushTokenChanges();

    return () => {
      appStateSub.remove();
      tokenSub.remove();
    };
  }, [profileId]);
}

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
 * Without these, a push sitting in the OS notification shade is a dead end -
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

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      // Previously only the unread badge count refreshed here - the actual
      // notifications list and every dashboard widget it can affect (open
      // issues, recent announcements, active passes, pending requests...)
      // sat stale until a manual pull-to-refresh, even though the push had
      // already arrived. A predicate catches all of them at once rather
      // than hand-mapping each notification type to the specific dashboard
      // query it happens to affect.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            typeof key === "string" &&
            (key === "notifications" ||
              key === "notifications_unread" ||
              key.startsWith("dashboard_"))
          );
        },
      });

      // A push only reaches this listener while the app is already open -
      // backgrounded/killed just gets the OS banner, there's no JS running
      // to react to. This is what makes an emergency interrupt whatever
      // screen the resident is already on, on top of the OS notification
      // they also got.
      const data = notification.request.content.data as
        | { kind?: string; photo_url?: string }
        | undefined;
      if (data?.kind === "emergency_alert") {
        useEmergencyAlertStore.getState().show({
          title: notification.request.content.title ?? "Emergency alert",
          body: notification.request.content.body ?? "",
          photoUrl: data.photo_url,
        });
      }
    });

    function openFromTap(response: Notifications.NotificationResponse) {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      // Role not known yet (launch): leave the tap stored; the effect re-runs once
      // the profile loads and picks it up then.
      if (!role) return;
      const data = response.notification.request.content.data as { kind?: string } | undefined;
      const path = notificationTapPath(data?.kind, role);
      if (path) router.push(path as never);
      // Taken: otherwise the same tap would be replayed on the next launch or sign-in.
      Notifications.clearLastNotificationResponseAsync();
    }

    const responseSub = Notifications.addNotificationResponseReceivedListener(openFromTap);

    // A tap that launched the app from fully closed arrives before any listener
    // exists, so it has to be read back. It waits for the role (the profile loads
    // a moment after launch); this effect re-runs once `role` is known.
    if (role) {
      Notifications.getLastNotificationResponseAsync().then((last) => {
        if (last) openFromTap(last);
      });
    }

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
  const profileError = useAuthStore((s) => s.profileError);
  const init = useAuthStore((s) => s.init);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => init(), [init]);
  useNativeAuthLinks();
  useBadgeSync(profile?.id);
  useNotificationRouting(profile?.role, router);

  usePushRegistration(profile?.id);

  const versionGate = useAppVersionGate();

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

    // Unapproved residents are ALWAYS confined to the onboarding wizard - this is
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

    // A household member whose access was revoked keeps their account (and
    // stays approved - see 0056) but gets nothing but this one screen. Not
    // reusing the onboarding redirect above: that wizard decides where to
    // send someone by querying estate_join_requests, which a household
    // member never has a row in, so it would tell them to search for an
    // estate all over again.
    if (profile.role === "resident" && profile.household_access_level === "revoked") {
      if (section !== "access-revoked") router.replace("/access-revoked" as never);
      return;
    }

    if (section !== undefined && SHARED_ROUTES.has(section)) return;

    const homePath = ROLE_HOME[profile.role];
    // A role this build doesn't know about (added server-side after release)
    // must not crash the router; leave it on the splash rather than throwing.
    if (!homePath) return;
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

  if (versionGate.state === "blocked") {
    return (
      <AppShell>
        <UpdateRequiredScreen
          message={versionGate.config.update_message}
          iosStoreUrl={versionGate.config.ios_store_url}
          androidStoreUrl={versionGate.config.android_store_url}
        />
      </AppShell>
    );
  }

  if (session && !profile && profileError) {
    return (
      <AppShell>
        <ProfileLoadError />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Slot />
      <EmergencyAlertModal />
      {versionGate.state === "nudge" && (
        <UpdateAvailableModal
          message={versionGate.config.update_message}
          iosStoreUrl={versionGate.config.ios_store_url}
          androidStoreUrl={versionGate.config.android_store_url}
        />
      )}
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
