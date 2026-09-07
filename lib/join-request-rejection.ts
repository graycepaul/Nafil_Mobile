/**
 * Single source of truth for the reject-request presets (RejectReasonModal)
 * and the follow-up advice shown to the resident (pending-approval.tsx).
 * `rejection_reason` on the DB row is just the checked presets' `label`s
 * joined with "; " plus any free-typed "Other" text (see
 * reject_join_request in 0040_join_request_notifications_and_rejection_reason.sql and
 * RejectReasonModal's own joining logic) - not a structured list - so
 * matching a preset back out of it is a literal substring check against
 * these exact label strings, not a separate stored field.
 */
export const REJECTION_PRESETS: { label: string; advice: string }[] = [
  {
    label: 'Unit not found in our records',
    advice: 'Double-check the unit number and try again.',
  },
  {
    label: "Name doesn't match the unit allocation",
    advice: 'Make sure the full name on your profile matches your estate’s records, then try again.',
  },
  {
    label: 'ID document is unclear or unreadable',
    advice: 'Retake the photo somewhere well-lit with all four corners visible, then try again.',
  },
  {
    label: 'Utility bill is older than 3 months',
    advice: 'Upload a utility bill dated within the last 3 months, then try again.',
  },
  {
    label: 'Service number could not be verified',
    advice: 'Double-check your service number and try again.',
  },
];

const FALLBACK_ADVICE =
  'Double-check your details, then submit a new request. If you think this is a mistake, contact your estate admin directly.';

/** Picks advice for whichever preset(s) show up verbatim in the reason text - falls back to generic advice for a custom/"Other" reason with no matching preset. */
export function adviceForRejectionReason(reason: string | null | undefined): string {
  if (!reason) return FALLBACK_ADVICE;
  const matched = REJECTION_PRESETS.filter((p) => reason.includes(p.label));
  if (matched.length === 0) return FALLBACK_ADVICE;
  // Dedupe identical advice text (two presets could share the same fix).
  return [...new Set(matched.map((p) => p.advice))].join(' ');
}
