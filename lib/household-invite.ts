import { supabase } from './supabase';
import type { HouseholdAccessLevel } from '../types/database';

export interface ValidatedHouseholdInvite {
  valid: boolean;
  estateName: string | null;
  accessLevel: HouseholdAccessLevel | null;
  phone: string | null;
  inviterName: string | null;
  inviteeName: string | null;
}

interface ValidateRpcResult {
  valid: boolean;
  estate_name: string | null;
  invite_access: HouseholdAccessLevel | null;
  invite_phone: string | null;
  inviter_name: string | null;
  invitee_name: string | null;
}

/** Checks a code before any account exists - callable while signed out. */
export async function validateHouseholdInviteCode(code: string): Promise<ValidatedHouseholdInvite> {
  const { data, error } = await supabase
    .rpc('validate_household_invite_code', { invite_code: code })
    .single();
  const result = data as ValidateRpcResult | null;

  if (error || !result || !result.valid) {
    return { valid: false, estateName: null, accessLevel: null, phone: null, inviterName: null, inviteeName: null };
  }
  return {
    valid: true,
    estateName: result.estate_name,
    accessLevel: result.invite_access,
    phone: result.invite_phone,
    inviterName: result.inviter_name,
    inviteeName: result.invitee_name,
  };
}

/** Saves profile details onto the invite row - there's no profile to attach them to yet. */
export async function saveHouseholdInviteProfile(params: {
  code: string;
  firstName: string;
  lastName: string;
}) {
  const { data, error } = await supabase.rpc('save_household_invite_profile', {
    invite_code: params.code,
    p_first_name: params.firstName,
    p_last_name: params.lastName,
  });
  return { success: !!data, error: error?.message };
}

/**
 * Called right after sign-up, while the new session is live. Bound to the
 * invite code (not just the account's phone number): the auth server
 * auto-confirms every sign-up, so a phone number on a session proves
 * nothing by itself - the code is the credential, and the database also
 * checks the account was created with the number that was invited.
 */
export async function acceptHouseholdInvite(code: string): Promise<{
  accepted: boolean;
  accessLevel: HouseholdAccessLevel | null;
}> {
  const { data, error } = await supabase.rpc('accept_household_invite', { p_code: code }).single();
  const result = data as { accepted: boolean; granted_access: HouseholdAccessLevel | null } | null;
  if (error || !result) return { accepted: false, accessLevel: null };
  return { accepted: result.accepted, accessLevel: result.granted_access };
}
