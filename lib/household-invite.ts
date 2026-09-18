import { supabase } from './supabase';
import type { HouseholdAccessLevel } from '../types/database';

export interface ValidatedHouseholdInvite {
  valid: boolean;
  estateName: string | null;
  accessLevel: HouseholdAccessLevel | null;
  email: string | null;
  inviterName: string | null;
}

interface ValidateRpcResult {
  valid: boolean;
  estate_name: string | null;
  invite_access: HouseholdAccessLevel | null;
  invite_email: string | null;
  inviter_name: string | null;
}

/** Checks a code before any account exists - callable while signed out. */
export async function validateHouseholdInviteCode(code: string): Promise<ValidatedHouseholdInvite> {
  const { data, error } = await supabase
    .rpc('validate_household_invite_code', { invite_code: code })
    .single();
  const result = data as ValidateRpcResult | null;

  if (error || !result || !result.valid) {
    return { valid: false, estateName: null, accessLevel: null, email: null, inviterName: null };
  }
  return {
    valid: true,
    estateName: result.estate_name,
    accessLevel: result.invite_access,
    email: result.invite_email,
    inviterName: result.inviter_name,
  };
}

/** Saves profile details onto the invite row - there's no profile to attach them to yet. */
export async function saveHouseholdInviteProfile(params: {
  code: string;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  const { data, error } = await supabase.rpc('save_household_invite_profile', {
    invite_code: params.code,
    p_first_name: params.firstName,
    p_last_name: params.lastName,
    p_phone: params.phone,
  });
  return { success: !!data, error: error?.message };
}

/**
 * Called once a real session exists (after the confirmation-email click) -
 * matches by the caller's own verified email and finalizes the household
 * link, unit, and approval. A harmless no-op for anyone without a matching
 * pending invite.
 */
export async function acceptHouseholdInviteByEmail(): Promise<{
  accepted: boolean;
  accessLevel: HouseholdAccessLevel | null;
}> {
  const { data, error } = await supabase.rpc('accept_household_invite_by_email').single();
  const result = data as { accepted: boolean; granted_access: HouseholdAccessLevel | null } | null;
  if (error || !result) return { accepted: false, accessLevel: null };
  return { accepted: result.accepted, accessLevel: result.granted_access };
}
