import { formatPhoneForDisplay, looksLikePhone, normalizePhone } from '../phone';

describe('normalizePhone', () => {
  it('turns Nigerian local numbers into international form', () => {
    expect(normalizePhone('0803 123 4567')).toBe('+2348031234567');
    expect(normalizePhone('8031234567')).toBe('+2348031234567');
  });
  it('keeps numbers that are already international', () => {
    expect(normalizePhone('+2348031234567')).toBe('+2348031234567');
    expect(normalizePhone('002348031234567')).toBe('+2348031234567');
    expect(normalizePhone('+44 7700 900123')).toBe('+447700900123');
  });
  it('drops the trunk zero people type after the country code (L5)', () => {
    expect(normalizePhone('+234 (0)803 123 4567')).toBe('+2348031234567');
    expect(normalizePhone('+234 0803 123 4567')).toBe('+2348031234567');
  });
  it('rejects things that cannot be a phone number', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });
});

describe('looksLikePhone and formatting', () => {
  it('tells a phone number from an email', () => {
    expect(looksLikePhone('0803 123 4567')).toBe(true);
    expect(looksLikePhone('a@b.com')).toBe(false);
  });
  it('formats a Nigerian number for display', () => {
    expect(formatPhoneForDisplay('+2348031234567')).toBe('+234 803 123 4567');
    expect(formatPhoneForDisplay(null)).toBe('');
  });
});
