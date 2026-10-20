/**
 * Supabase/PostgREST errors are accurate but never meant for an end user -
 * "Could not find the table 'public.issue_comments' in the schema cache" is
 * exactly the kind of thing that should never reach a resident's screen.
 * Unlike auth errors (see auth-errors.ts, which deliberately shows Supabase's
 * own text when unmapped because it's usually already user-appropriate),
 * database error text can contain table/column names, policy internals, or
 * schema state - genuinely confusing rather than just unpolished - so the
 * default here is a safe generic message for anything not explicitly known,
 * never the raw text.
 *
 * Specific, already-good handling for a particular error (e.g. a duplicate
 * join request checking `error.code === '23505'` for its own friendly copy)
 * should stay as its own check before falling back to this - this is the
 * catch-all, not a replacement for a message that's already tailored to the
 * action the user just took.
 */
interface DbErrorLike {
  code?: string;
  message?: string;
}

const CODE_MESSAGES: Record<string, string> = {
  '23505': 'That already exists.',
  '23503': 'That can’t be completed - something it depends on is missing or was removed.',
  '23514': 'That value isn’t allowed.',
  '42501': 'You don’t have permission to do that.',
  PGRST116: 'That couldn’t be found. It may have been removed.',
};

const TEXT_MESSAGES: { match: RegExp; message: string }[] = [
  // Rules enforced by the database itself (see 0065_money_integrity.sql). Their
  // messages are written for people, so they map to equally plain copy.
  {
    match: /already awaiting confirmation/i,
    message: 'You have already submitted a transfer for this. It is waiting to be confirmed.',
  },
  {
    match: /due was not found|already paid|is not yours/i,
    message: 'That payment is no longer available. Refresh and try again.',
  },
  {
    match: /amount must match/i,
    message: 'The amount does not match what is owed. Refresh and try again.',
  },
  {
    match: /no longer available/i,
    message: 'This item is no longer available.',
  },
  {
    match: /cannot buy your own listing/i,
    message: 'You can not buy your own listing.',
  },
  {
    match: /only an order that is still awaiting transfer/i,
    message: 'This order can no longer be cancelled because it has already been paid.',
  },
  {
    match: /could not find the table|schema cache/i,
    message: 'Something went wrong loading that. Please try again in a moment.',
  },
  {
    match: /row-level security|permission denied|not authorized/i,
    message: 'You don’t have permission to do that.',
  },
  {
    match: /network|fetch failed|failed to fetch/i,
    message: 'Can’t reach the server. Check your connection and try again.',
  },
];

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

export function friendlyDbError(error: unknown): string {
  if (!error) return GENERIC_FALLBACK;

  const { code, message } = error as DbErrorLike;

  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const raw = typeof message === 'string' ? message : '';
  const hit = TEXT_MESSAGES.find(({ match }) => match.test(raw));
  if (hit) return hit.message;

  return GENERIC_FALLBACK;
}
