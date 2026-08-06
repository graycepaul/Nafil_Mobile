import "../global.css";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../context/theme-context";
import { useAuthStore } from "../store/auth-store";
import {
  establishSessionFromUrl,
  urlLooksLikeAuthLink,
} from "../lib/auth-session";
import { registerForPushNotifications } from "../lib/push-notifications";
import type { UserRole } from "../types/database";

const queryClient = new QueryClient();

const ROLE_HOME: Record<UserRole, string> = {
  resident: "/resident",
  security: "/security",
  admin: "/admin",
  super_admin: "/admin",
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

function RootNavigation() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const init = useAuthStore((s) => s.init);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => init(), [init]);
  useNativeAuthLinks();

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

  return <Slot />;
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
