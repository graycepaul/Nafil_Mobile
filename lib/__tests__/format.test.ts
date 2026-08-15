import { titleCase, relativeTime, expiryLabel } from '../format';

describe('titleCase', () => {
  it('capitalizes each word from mixed-case free text', () => {
    expect(titleCase('grace balogun')).toBe('Grace Balogun');
    expect(titleCase('ADE JOHNSON')).toBe('Ade Johnson');
  });

  it('trims surrounding whitespace', () => {
    expect(titleCase('  chidi okafor  ')).toBe('Chidi Okafor');
  });
});

describe('relativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('says "Just now" for under a minute', () => {
    expect(relativeTime(new Date('2026-01-15T11:59:30Z').toISOString())).toBe('Just now');
  });

  it('formats minutes', () => {
    expect(relativeTime(new Date('2026-01-15T11:45:00Z').toISOString())).toBe('15m ago');
  });

  it('formats hours', () => {
    expect(relativeTime(new Date('2026-01-15T09:00:00Z').toISOString())).toBe('3h ago');
  });

  it('formats days', () => {
    expect(relativeTime(new Date('2026-01-12T12:00:00Z').toISOString())).toBe('3d ago');
  });
});

describe('expiryLabel', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('labels a future time as expiring in', () => {
    expect(expiryLabel(new Date('2026-01-15T14:00:00Z').toISOString())).toBe('Expires in 2h');
  });

  it('labels a past time as already expired', () => {
    expect(expiryLabel(new Date('2026-01-15T10:00:00Z').toISOString())).toBe('Expired 2h ago');
  });
});
