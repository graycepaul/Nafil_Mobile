/** Nigerian bank account numbers (NUBAN) are exactly 10 digits. */
export const ACCOUNT_NUMBER_LENGTH = 10;

/** Returns an error message for an account number that cannot be right, or undefined if it looks valid. */
export function validateAccountNumber(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 'Enter the account number.';
  if (digits.length !== ACCOUNT_NUMBER_LENGTH) {
    return `Account numbers are ${ACCOUNT_NUMBER_LENGTH} digits. Check it and try again.`;
  }
  return undefined;
}
