import type { AuthError } from '@supabase/supabase-js';

/**
 * Supabase auth errors are accurate but terse ("Invalid login credentials").
 * This maps the ones users actually hit onto copy that says what to do next.
 *
 * Note on "Invalid login credentials": Supabase deliberately does not reveal
 * whether it was the email or the password that was wrong, so neither do we —
 * saying "no account with that email" would let anyone enumerate registered users.
 */
const MESSAGES: Array<{ match: RegExp; message: string }> = [
  {
    match: /invalid login credentials/i,
    message: 'That email and password don’t match. Check both and try again.',
  },
  {
    match: /email not confirmed/i,
    message: 'Confirm your email first. Check your inbox for the link we sent.',
  },
  {
    match: /user already registered|already been registered/i,
    message: 'An account with this email already exists. Try signing in instead.',
  },
  {
    match: /password should be at least/i,
    message: 'That password is too short. Use at least 8 characters.',
  },
  {
    match: /for security purposes|rate limit|too many requests/i,
    message: 'Too many attempts. Wait a minute before trying again.',
  },
  {
    // Supabase phrases this as: Email address "x@y.test" is invalid.
    // Common cause in testing: reserved TLDs (.test/.local/.invalid) can't receive
    // mail, so Supabase refuses to send to them at all.
    match: /unable to validate email|invalid email|email address .* is invalid/i,
    message:
      'That email address can’t receive mail. Use a real address you can access.',
  },
  {
    // Each social provider needs enabling in Supabase → Authentication → Providers
    // with its own client ID/secret before these buttons can work.
    match: /provider is not enabled|unsupported provider/i,
    message: 'That sign-in option isn’t set up yet. Use your email and password for now.',
  },
  {
    match: /network|fetch failed|failed to fetch/i,
    message: 'Can’t reach the server. Check your connection and try again.',
  },
  {
    match: /same password/i,
    message: 'That’s already your current password. Choose a different one.',
  },
];

export function authErrorMessage(error: AuthError | Error | null): string | undefined {
  if (!error) return undefined;
  const raw = error.message ?? '';
  const hit = MESSAGES.find(({ match }) => match.test(raw));
  if (hit) return hit.message;
  // Unmapped: show Supabase's own text rather than a vague fallback, so real
  // failures stay diagnosable instead of hiding behind "something went wrong".
  return raw || 'Something went wrong. Please try again.';
}
