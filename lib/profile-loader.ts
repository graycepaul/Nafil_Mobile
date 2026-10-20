import type { Profile } from '../types/database';

export interface ProfileLoad {
  profile: Profile | null;
  /** True when the profile could not be read at all (network, server). A signed-in user with no profile row is also reported this way after the retries. */
  failed: boolean;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Reads the signed-in user's profile, retrying a couple of times before giving
 * up, so a brief network drop at launch does not leave the app on the splash
 * screen with a valid session and no profile. `delaysMs` is the wait before
 * each retry; `sleep` is injectable for tests.
 */
export async function loadProfileWithRetry(
  fetchOnce: () => Promise<ProfileLoad>,
  delaysMs: number[] = [800, 2000],
  sleep: (ms: number) => Promise<void> = wait
): Promise<ProfileLoad> {
  let result = await fetchOnce();
  for (const delay of delaysMs) {
    if (!result.failed) return result;
    await sleep(delay);
    result = await fetchOnce();
  }
  return result;
}
