/**
 * Turns whatever a person typed or picked from their contacts into the
 * international form GoTrue and the household-invite tables both use
 * ("+2348012345678"), or null if it can't be a phone number.
 *
 * Defaults to Nigeria - this app serves Nigerian estates, and residents
 * type "0803 123 4567" far more often than "+234 803 123 4567" - but an
 * explicit "+" or "00" prefix is always taken as already international.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = `234${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `234${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/** True when a sign-in field looks like a phone number rather than an email. */
export function looksLikePhone(input: string): boolean {
  const trimmed = input.trim();
  return !!trimmed && !trimmed.includes('@') && /^[\d\s()+-]+$/.test(trimmed);
}

/** "2348012345678" or "+2348012345678" -> "+234 801 234 5678"-style display, best effort. */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return `+${digits}`;
}
