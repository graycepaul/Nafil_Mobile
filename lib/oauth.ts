import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';
import { establishSessionFromUrl, getAuthRedirectUrl } from './auth-session';

interface OAuthResult {
  error?: Error | null;
  cancelled?: boolean;
}

/**
 * Starts Google sign-in.
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

/**
 * Starts Sign in with Apple using the device's native Apple Authentication Services
 * (iOS only — `AppleAuthButton` in `SocialAuthRow.tsx` only renders on iOS). Unlike
 * Google, this never opens a browser: `signInAsync` shows Apple's own system sheet
 * and hands back a signed identity token directly, which we exchange with Supabase
 * via `signInWithIdToken`.
 *
 * Apple only includes the user's name in `credential.fullName` on the *first*
 * authorization ever granted to this app — every sign-in after that returns null
 * for it, so we save it to user metadata right away while we still have it.
 */
export async function signInWithApple(): Promise<OAuthResult> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'ERR_REQUEST_CANCELED') return { cancelled: true };
    return { error: e instanceof Error ? e : new Error('Sign-in failed.') };
  }

  if (!credential.identityToken) {
    return { error: new Error('Could not complete sign-in. Please try again.') };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) return { error };

  if (credential.fullName) {
    const nameParts = [credential.fullName.givenName, credential.fullName.familyName].filter(
      (part): part is string => !!part
    );
    if (nameParts.length > 0) {
      await supabase.auth.updateUser({
        data: {
          full_name: nameParts.join(' '),
          given_name: credential.fullName.givenName,
          family_name: credential.fullName.familyName,
        },
      });
    }
  }

  return {};
}
