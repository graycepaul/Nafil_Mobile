import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { establishSessionFromUrl, getAuthRedirectUrl } from './auth-session';

interface OAuthResult {
  error?: Error | null;
  cancelled?: boolean;
}

/**
 * Starts Google sign-in — the only OAuth provider this app integrates.
 *
 * We pass `skipBrowserRedirect` on BOTH platforms, which matters more on web than it
 * looks: left to itself, the web client navigates straight to Supabase's authorize
 * endpoint, so a misconfigured provider dumps the user on a raw JSON error page with
 * no route back into the app — our error handling never gets to run. Asking for the
 * URL instead lets us surface failures inline and redirect only on success.
 *
 * Google must be enabled in Supabase (Authentication → Providers) with an OAuth
 * client ID/secret before this works — see `GOOGLE_OAUTH_ENABLED` in auth-config.ts.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  const isWeb = Platform.OS === 'web';
  // Web has no dedicated callback screen — it lands on `/`, which already redirects
  // by role once the session resolves. Native's `WebBrowser.openAuthSessionAsync`
  // intercepts this URL directly without ever routing the app there, so the path
  // just needs to match what Supabase was told to redirect to; it doesn't need to
  // be a real screen the way `/set-password` does for email links.
  const redirectTo = getAuthRedirectUrl(isWeb ? '/' : '/auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) return { error };
  if (!data?.url) return { error: new Error('Could not start sign-in. Please try again.') };

  if (isWeb) {
    window.location.assign(data.url);
    return {}; // page is navigating away
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo!);
  if (result.type !== 'success') return { cancelled: true };

  const { success, error: sessionError } = await establishSessionFromUrl(result.url);
  if (!success) {
    return { error: sessionError ?? new Error('Sign-in did not complete. Please try again.') };
  }
  return {};
}
