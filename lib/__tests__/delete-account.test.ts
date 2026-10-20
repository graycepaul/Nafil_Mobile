import { afterFailedDelete } from '../delete-account';

describe('afterFailedDelete (M7)', () => {
  it('keeps the user signed in when the account still exists', () => {
    expect(afterFailedDelete(null)).toBe('stay');
  });
  it('keeps the user signed in on a dropped connection, so they can retry', () => {
    expect(afterFailedDelete({ name: 'AuthRetryableFetchError', status: 0 })).toBe('stay');
    expect(afterFailedDelete({ name: 'TypeError' })).toBe('stay');
  });
  it('signs out only when the server says the user no longer exists', () => {
    expect(afterFailedDelete({ name: 'AuthApiError', status: 403 })).toBe('signOut');
    expect(afterFailedDelete({ name: 'AuthApiError', status: 401 })).toBe('signOut');
  });
});
