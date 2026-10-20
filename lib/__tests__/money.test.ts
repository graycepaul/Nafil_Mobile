import { TOPUP_MAX, TOPUP_MIN, parseAmount, validateTopUp } from '../money';
import { validateAccountNumber } from '../bank-account';
import { friendlyDbError } from '../db-errors';

describe('parseAmount', () => {
  it('keeps digits only', () => {
    expect(parseAmount('10000')).toBe(10000);
    expect(parseAmount('₦10,000')).toBe(10000);
    expect(parseAmount('10 000')).toBe(10000);
  });
  it('turns empty or non-numeric text into 0 instead of NaN', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
});

describe('validateTopUp', () => {
  it('rejects empty and zero (M12 regression)', () => {
    expect(validateTopUp(parseAmount(''))).toBeDefined();
    expect(validateTopUp(0)).toBeDefined();
    expect(validateTopUp(NaN)).toBeDefined();
  });
  it('enforces the minimum and maximum, inclusive', () => {
    expect(validateTopUp(TOPUP_MIN - 1)).toMatch(/minimum/);
    expect(validateTopUp(TOPUP_MIN)).toBeUndefined();
    expect(validateTopUp(TOPUP_MAX)).toBeUndefined();
    expect(validateTopUp(TOPUP_MAX + 1)).toMatch(/maximum/);
  });
  it('accepts the presets the wallet screen offers', () => {
    for (const preset of [5000, 10000, 20000, 50000]) expect(validateTopUp(preset)).toBeUndefined();
  });
});

describe('validateAccountNumber', () => {
  it('requires exactly 10 digits (M13 regression)', () => {
    expect(validateAccountNumber('')).toBeDefined();
    expect(validateAccountNumber('123456789')).toMatch(/10 digits/);
    expect(validateAccountNumber('12345678901')).toMatch(/10 digits/);
    expect(validateAccountNumber('0123456789')).toBeUndefined();
  });
  it('ignores spaces and dashes people type', () => {
    expect(validateAccountNumber('0123 456 789')).toBeUndefined();
    expect(validateAccountNumber('0123-456-789')).toBeUndefined();
  });
});

describe('friendlyDbError: rules enforced by 0065', () => {
  const raised = (message: string) => ({ code: 'P0001', message });
  it('explains a duplicate transfer instead of a generic failure', () => {
    expect(friendlyDbError(raised('a transfer for this charge is already awaiting confirmation'))).toMatch(
      /already submitted/
    );
  });
  it('explains an unavailable listing and a bad amount', () => {
    expect(friendlyDbError(raised('this listing is no longer available'))).toMatch(/no longer available/);
    expect(friendlyDbError(raised('the transfer amount must match the due'))).toMatch(/does not match/);
  });
  it('still falls back to the generic message for anything else', () => {
    expect(friendlyDbError(raised('some internal detail'))).toBe('Something went wrong. Please try again.');
  });
});

describe('friendlyDbError: photo uploads', () => {
  it('explains an unsupported or oversized photo instead of a generic failure', () => {
    expect(friendlyDbError({ message: 'mime type image/heic is not supported' })).toMatch(/JPEG or PNG/);
    expect(friendlyDbError({ message: 'The object exceeded the maximum allowed size' })).toMatch(/too large/);
  });
});
