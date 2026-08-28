/**
 * Whether Google sign-in is actually configured in Supabase.
 *
 * This has to be a declared flag rather than something detected at runtime.
 * `signInWithOAuth` with `skipBrowserRedirect` builds the authorize URL client-side
 * and makes no server call, so the app genuinely cannot tell an enabled provider
 * from a disabled one — the failure only surfaces *after* navigating, as a raw JSON
 * error page with no route back into the app.
 *
 * So the button checks this first and explains itself instead of navigating.
 *
 * To turn it on:
 *   1. Supabase dashboard → Authentication → Providers → Google → enable, add the
 *      OAuth client ID/secret from Google Cloud Console.
 *   2. Add https://itfepppqjtodmizbglze.supabase.co/auth/v1/callback as an
 *      authorised redirect URI in the Google Cloud OAuth client.
 *   3. Flip this to true.
 */
export const GOOGLE_OAUTH_ENABLED = false;

/**
 * Whether to show the "Or sign in/up with" social row at all (Apple + Google).
 *
 * Off for the App Store resubmission: Guideline 4.8 only applies when the app
 * offers a third-party login in the first place — email/password alone isn't
 * subject to it. Turning this off removes the whole obligation rather than
 * requiring a working Sign in with Apple, which is still failing on-device
 * with a generic `ASAuthorizationError.canceled` we haven't root-caused yet
 * (see `lib/oauth.ts` — `signInWithApple`).
 *
 * Flip back to true once that's fixed; the implementation itself is untouched.
 */
export const SOCIAL_AUTH_ENABLED = false;
