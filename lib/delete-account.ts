/**
 * What to do after a delete-account request fails, given the result of asking
 * the auth server whether the signed-in user still exists.
 *
 * The request can fail after the account was already deleted (the response
 * never arrived), and a retry is safe because the backend treats "already gone"
 * as success. So a failure is only a reason to sign out if the server says the
 * account really is gone (a definitive auth error). A dropped connection, or the
 * account still existing, means: stay signed in and show the error.
 */
export function afterFailedDelete(userCheckError: { name?: string; status?: number } | null): 'signOut' | 'stay' {
  if (!userCheckError) return 'stay'; // the account still exists
  if (userCheckError.name === 'AuthRetryableFetchError') return 'stay'; // could not reach the server
  if (userCheckError.status === undefined) return 'stay'; // not an auth-server answer
  return 'signOut'; // the server answered that this user/token no longer exists
}
