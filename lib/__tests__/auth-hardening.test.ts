import { authErrorMessage } from '../auth-errors';
import { shouldApplyAuthLink, userIdFromAccessToken } from '../auth-link';
import { loadProfileWithRetry } from '../profile-loader';

/** A structurally valid (unsigned) access token for a given user id. */
function tokenFor(sub: string): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64({ sub })}.signature`;
}
const hashLink = (type: string | null, sub = 'user-a') =>
  `nafil-estates://set-password#access_token=${tokenFor(sub)}&refresh_token=r${type ? `&type=${type}` : ''}`;

describe('authErrorMessage: server failures (H5)', () => {
  it('never shows an empty or {} body', () => {
    expect(authErrorMessage(new Error('{}'))).toMatch(/our side/);
    expect(authErrorMessage(new Error(''))).toMatch(/our side/);
  });
  it('maps a 5xx and the SMTP failure to a plain message', () => {
    expect(authErrorMessage(Object.assign(new Error('boom'), { status: 500 }) as never)).toMatch(/our side/);
    expect(authErrorMessage(new Error('Error sending recovery email'))).toMatch(/our side/);
  });
  it('still maps the known sign-in errors', () => {
    expect(authErrorMessage(new Error('Invalid login credentials'))).toMatch(/don’t match/);
  });
});

describe('shouldApplyAuthLink (M10)', () => {
  it('accepts a normal reset link when signed out', () => {
    expect(shouldApplyAuthLink(hashLink('recovery'), null)).toBe(true);
    expect(shouldApplyAuthLink(hashLink('invite'), undefined)).toBe(true);
  });
  it('ignores a link with no type, or a type our emails never send', () => {
    expect(shouldApplyAuthLink(hashLink(null), null)).toBe(false);
    expect(shouldApplyAuthLink(hashLink('admin'), null)).toBe(false);
  });
  it('ignores a link with no usable credentials', () => {
    expect(shouldApplyAuthLink('nafil-estates://set-password#type=recovery', null)).toBe(false);
    expect(shouldApplyAuthLink('nafil-estates://set-password#access_token=x&type=recovery', null)).toBe(false);
  });
  it('accepts a one-time-code link when signed out', () => {
    expect(shouldApplyAuthLink('nafil-estates://set-password?token_hash=abc&type=recovery', null)).toBe(true);
  });
  it('does not let a link replace a different signed-in user', () => {
    expect(shouldApplyAuthLink(hashLink('recovery', 'user-b'), 'user-a')).toBe(false);
    expect(shouldApplyAuthLink('nafil-estates://set-password?token_hash=abc&type=recovery', 'user-a')).toBe(false);
  });
  it('allows a link for the already signed-in user', () => {
    expect(shouldApplyAuthLink(hashLink('recovery', 'user-a'), 'user-a')).toBe(true);
  });
  it('reads the user id out of an access token', () => {
    expect(userIdFromAccessToken(tokenFor('user-z'))).toBe('user-z');
    expect(userIdFromAccessToken('not-a-token')).toBeNull();
  });
});

describe('loadProfileWithRetry (M6)', () => {
  const ok = { profile: { id: 'p' } as never, failed: false };
  const down = { profile: null, failed: true };
  const noSleep = async () => {};

  it('returns immediately on success without retrying', async () => {
    const fetchOnce = jest.fn().mockResolvedValue(ok);
    expect(await loadProfileWithRetry(fetchOnce, [1, 1], noSleep)).toBe(ok);
    expect(fetchOnce).toHaveBeenCalledTimes(1);
  });
  it('recovers from a brief failure', async () => {
    const fetchOnce = jest.fn().mockResolvedValueOnce(down).mockResolvedValueOnce(ok);
    expect((await loadProfileWithRetry(fetchOnce, [1, 1], noSleep)).failed).toBe(false);
    expect(fetchOnce).toHaveBeenCalledTimes(2);
  });
  it('gives up after the retries and reports failure, so the app can offer a retry', async () => {
    const fetchOnce = jest.fn().mockResolvedValue(down);
    const result = await loadProfileWithRetry(fetchOnce, [1, 1], noSleep);
    expect(result.failed).toBe(true);
    expect(fetchOnce).toHaveBeenCalledTimes(3);
  });
});
