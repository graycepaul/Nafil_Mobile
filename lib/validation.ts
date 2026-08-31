/** Deliberately permissive — the authoritative check is whether the email receives mail. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (!EMAIL_RE.test(email)) return 'That doesn’t look like a valid email address.';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Enter a password.';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function validateRequired(value: string, field: string): string | undefined {
  return value.trim() ? undefined : `Enter your ${field}.`;
}

/** Deliberately permissive on format (international numbers, spaces, dashes) — just checks something phone-shaped was entered. */
export function validatePhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 'Enter a phone number.';
  if (digits.length < 7) return 'That phone number looks too short.';
  return undefined;
}

export function validateConfirmation(password: string, confirmation: string): string | undefined {
  if (!confirmation) return 'Re-enter your password.';
  if (password !== confirmation) return 'Passwords don’t match.';
  return undefined;
}

export type PasswordStrength = 'weak' | 'fair' | 'strong';

/**
 * Length-weighted with a small bonus for character variety. Intentionally simple —
 * it's a nudge toward better passwords, not a security control. The real control is
 * the minimum length enforced above and by Supabase.
 */
export function passwordStrength(value: string): { level: PasswordStrength; label: string } {
  if (value.length < MIN_PASSWORD_LENGTH) return { level: 'weak', label: 'Too short' };

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;

  if (value.length >= 12 && variety >= 3) return { level: 'strong', label: 'Strong password' };
  if (variety >= 2) return { level: 'fair', label: 'Fair password' };
  return { level: 'weak', label: 'Try adding numbers or symbols' };
}
