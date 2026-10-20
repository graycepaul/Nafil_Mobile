import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nafil.pending_staff_invite_code';

/**
 * The invite code is saved before the account is created and consumed once the
 * new session's profile exists (see the onboarding router), because sign-up and
 * the first profile load happen a moment apart, or, if the auth server ever
 * requires email confirmation, days apart. Acceptance is by code AND email, so
 * knowing the invited address alone is no longer enough to take the role.
 */
export async function savePendingStaffInviteCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code.trim());
  } catch {
    // Storage unavailable: the invite can be re-entered; nothing else depends on this.
  }
}

export async function clearPendingStaffInviteCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // nothing to clean up
  }
}

export async function takePendingStaffInviteCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(KEY);
    if (code) await AsyncStorage.removeItem(KEY);
    return code || null;
  } catch {
    return null;
  }
}
