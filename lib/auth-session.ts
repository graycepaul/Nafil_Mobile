import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Builds the redirect URL Supabase sends a user back to after clicking an email
 * link (password reset, invite, magic link) — a real route in this app, not a
 * generic "return to the app" URL, so the link lands exactly on `set-password`
 * rather than the splash.
 *
 * Web: an absolute URL on the current origin.
 * Native: the app's custom scheme, e.g. `nafil-estates://set-password`.
 *
 * Whichever URL this produces must be added to Supabase's redirect URL allowlist
 * (Authentication → URL Configuration) or the email link falls back to the
 * project's default Site URL instead.
 */
export function getAuthRedirectUrl(path: string): string | undefined {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined;
  }
  return Linking.createURL(path);
}

interface UrlSessionResult {
  success: boolean;
  type?: string;
  error?: Error;
}

/**
 * Parses tokens out of a Supabase auth link and establishes a session from them.
 * Handles both formats Supabase has used for email links:
 *   - Implicit grant: `#access_token=...&refresh_token=...&type=recovery`
 *   - PKCE/OTP confirm: `?token_hash=...&type=recovery`
 *
 * This is the native counterpart to `detectSessionInUrl` on web — native deep
 * links land in `Linking`'s event/getInitialURL APIs as a raw string, not a
 * browser URL the Supabase client can auto-parse, so we do it by hand. Also used
 * to consolidate the token-parsing that Google sign-in already needed on native
 * (see `oauth.ts`), rather than duplicating the parsing logic in two places.
 */
export async function establishSessionFromUrl(url: string): Promise<UrlSessionResult> {
  try {
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');

    const hashParams = new URLSearchParams(hashIndex >= 0 ? url.slice(hashIndex + 1) : '');
    const queryParams = new URLSearchParams(
      queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : ''
    );

    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    const type = hashParams.get('type') ?? queryParams.get('type') ?? undefined;

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      return error ? { success: false, error } : { success: true, type };
    }

    const token_hash = queryParams.get('token_hash');
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as EmailOtpType,
      });
      return error ? { success: false, error } : { success: true, type };
    }

    return { success: false };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e : new Error('Could not read that link.'),
    };
  }
}

/** True if a URL looks like it's carrying auth tokens, before we bother parsing it. */
export function urlLooksLikeAuthLink(url: string): boolean {
  return /access_token=|token_hash=/.test(url);
}
