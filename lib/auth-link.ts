// Pure rules for deciding whether an incoming deep link may establish a session.
// Kept free of the Supabase client so they can be unit tested.

/**
 * The link types the app's own emails produce. A crafted link with any other
 * type, or none, is ignored rather than turned into a session.
 */
const TRUSTED_LINK_TYPES = new Set(['recovery', 'invite', 'signup', 'magiclink', 'email_change']);

function linkParams(url: string): { hash: URLSearchParams; query: URLSearchParams } {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  return {
    hash: new URLSearchParams(hashIndex >= 0 ? url.slice(hashIndex + 1) : ''),
    query: new URLSearchParams(
      queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : undefined) : ''
    ),
  };
}

/** The user id inside a Supabase access token, read without verifying it (only used to compare against the signed-in user). */
export function userIdFromAccessToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Whether a deep link should be allowed to establish a session. Applying tokens
 * from any URL that contains them lets a crafted link sign the user into
 * someone else's account (whatever they then enter goes to that account), so a
 * link must (1) be one of the types our own emails send, and (2) not silently
 * replace a different signed-in user. Someone already signed in who opens a
 * reset link for another account has to sign out first.
 */
export function shouldApplyAuthLink(url: string, currentUserId: string | null | undefined): boolean {
  const { hash, query } = linkParams(url);
  const type = hash.get('type') ?? query.get('type');
  if (!type || !TRUSTED_LINK_TYPES.has(type)) return false;

  const accessToken = hash.get('access_token');
  const hasTokens = !!accessToken && !!hash.get('refresh_token');
  const hasOtp = !!query.get('token_hash');
  if (!hasTokens && !hasOtp) return false;

  if (currentUserId) {
    // A token link for the same user is harmless; anything else (a different
    // user, or a one-time-code link we cannot attribute) must not replace the session.
    return hasTokens && userIdFromAccessToken(accessToken!) === currentUserId;
  }
  return true;
}
