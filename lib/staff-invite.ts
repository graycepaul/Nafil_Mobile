import { supabase } from './supabase';
import type { UserRole } from '../types/database';

export interface ValidatedInvite {
  valid: boolean;
  estateName: string | null;
  role: UserRole | null;
  email: string | null;
}

interface ValidateInviteRpcResult {
  valid: boolean;
  estate_name: string | null;
  invite_role: UserRole | null;
  invite_email: string | null;
}

/** Checks a code before any account exists — callable while signed out. */
export async function validateStaffInviteCode(code: string): Promise<ValidatedInvite> {
  const { data, error } = await supabase
    .rpc('validate_staff_invite_code', { invite_code: code })
    .single();
  const result = data as ValidateInviteRpcResult | null;

  if (error || !result) return { valid: false, estateName: null, role: null, email: null };
  return {
    valid: result.valid,
    estateName: result.estate_name,
    role: result.invite_role,
    email: result.invite_email,
  };
}

/** Saves profile details onto the invite row — there's no profile to attach them to yet. */
export async function saveStaffInviteProfile(params: {
  code: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl?: string | null;
}) {
  const { data, error } = await supabase.rpc('save_staff_invite_profile', {
    invite_code: params.code,
    p_first_name: params.firstName,
    p_last_name: params.lastName,
    p_phone: params.phone,
    p_avatar_url: params.avatarUrl ?? null,
  });
  return { success: !!data, error: error?.message };
}

/**
 * Called once a real session exists (after the confirmation-email click) —
 * matches by the caller's own verified email, finalizing role/estate/approved
 * and copying over the name/phone/photo saved during the anonymous steps.
 */
export async function acceptStaffInviteByEmail(): Promise<{ accepted: boolean; role: UserRole | null }> {
  const { data, error } = await supabase.rpc('accept_staff_invite_by_email').single();
  const result = data as { accepted: boolean; granted_role: UserRole | null } | null;
  if (error || !result) return { accepted: false, role: null };
  return { accepted: result.accepted, role: result.granted_role };
}
