/** Smallest and largest wallet top-up the app accepts, in naira. */
export const TOPUP_MIN = 100;
export const TOPUP_MAX = 5_000_000;

/** Digits only: "₦10,000" or "10 000" -> 10000. Empty or non-numeric text -> 0. */
export function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/** Returns an error message for a top-up amount the app will not send, or undefined if it is fine. */
export function validateTopUp(amount: number): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount to fund.';
  if (amount < TOPUP_MIN) return `The minimum top-up is ₦${TOPUP_MIN.toLocaleString()}.`;
  if (amount > TOPUP_MAX) return `The maximum top-up is ₦${TOPUP_MAX.toLocaleString()}.`;
  return undefined;
}
