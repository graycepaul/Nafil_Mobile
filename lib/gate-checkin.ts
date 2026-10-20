import type { SupabaseClient } from '@supabase/supabase-js';
import { friendlyDbError } from './db-errors';
import type { ScanResult } from '../components/security/ScanResultModal';
import type {
  HouseholdMember,
  Profile,
  VisitorLogEntryType,
  VisitorLogMethod,
  VisitorPass,
} from '../types/database';

/**
 * The gate decision logic, kept free of React and of the Supabase client so
 * every branch can be tested. `performCheckIn` never throws and always returns
 * something a guard can act on: a success, a denial, or "couldn't check, try
 * again". It never reports "not recognized" for a lookup that actually failed.
 */

export interface Lookup<T> {
  data: T | null;
  /** True when the request itself failed (network, server), as opposed to finding nothing. */
  error: boolean;
}

export interface LogEntryInput {
  estate_id: string;
  security_id: string;
  visitor_name: string;
  method: VisitorLogMethod;
  entry_type: VisitorLogEntryType;
  pass_id?: string;
  vehicle_plate?: string | null;
}

export type ClaimOutcome = 'claimed' | 'lost' | 'error';

export interface GateApi {
  findResidentByCode(code: string, estateId: string): Promise<Lookup<Profile>>;
  findHouseholdCardByCode(code: string, estateId: string): Promise<Lookup<HouseholdMember>>;
  findPassByCode(code: string, estateId: string): Promise<Lookup<VisitorPass>>;
  /** record_household_member_scan: re-checks the card's status server-side. Returns null on success, else a user-safe message. */
  recordHouseholdScan(memberId: string): Promise<string | null>;
  /**
   * Flips a pass pending -> used only if it is still pending, and reports
   * whether this call is the one that did it. A scan that loses a race (the
   * pass was used or revoked a moment earlier) gets 'lost', never 'claimed'.
   */
  claimPass(passId: string): Promise<ClaimOutcome>;
  /** Returns the server's check-in time, or null if the entry could not be saved. */
  insertLog(entry: LogEntryInput): Promise<string | null>;
}

export interface GateContext {
  estateId: string;
  securityId: string;
}

export interface CheckInOutcome {
  result: ScanResult;
  /** True when something was written (so the on-site and register lists should refresh). */
  changed: boolean;
}

const LOG_FAILED_NOTE = 'The entry could not be saved to the register. Note it down manually.';

function formatTime(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function couldNotVerify(): CheckInOutcome {
  return {
    changed: false,
    result: {
      tone: 'error',
      title: "Couldn't check this code",
      message: 'Check the connection and try again. Nobody has been checked in.',
    },
  };
}

/**
 * Saves a log row. Resident and household entries are retried once: they are
 * harmless to duplicate. A visitor entry is not retried, since a first insert
 * that succeeded but whose response was lost would put the same visitor
 * on-site twice; the guard gets a "note it down" message instead.
 */
async function saveLog(api: GateApi, entry: LogEntryInput): Promise<string | null> {
  const first = await api.insertLog(entry);
  if (first !== null || entry.entry_type === 'visitor') return first;
  return api.insertLog(entry);
}

export async function performCheckIn(
  api: GateApi,
  ctx: GateContext,
  rawCode: string,
  via: VisitorLogMethod,
  now: () => number = Date.now
): Promise<CheckInOutcome> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { changed: false, result: { tone: 'error', title: 'No code entered', message: 'Enter or scan a code.' } };
  }

  // Resident e-ID: a standing credential, not a single-use pass. The photo and
  // name are for the guard's own eyes; only this live lookup means anything.
  const resident = await api.findResidentByCode(code, ctx.estateId);
  if (resident.error) return couldNotVerify();

  if (resident.data) {
    const person = resident.data;
    const name = person.full_name ?? 'Resident';

    // A revoked household member keeps their profile (so a re-invite can restore
    // it) and so keeps their code, which still matches here. Their access to the
    // estate is gone, so deny it explicitly.
    if (person.household_access_level === 'revoked') {
      return {
        changed: false,
        result: {
          tone: 'error',
          title: 'Access denied',
          message: `${name}'s access was revoked by the resident.`,
          photoUrl: person.avatar_url,
          photoName: person.full_name,
        },
      };
    }
    if (!person.approved) {
      return {
        changed: false,
        result: {
          tone: 'error',
          title: 'Access denied',
          message: `${name} is not an approved resident.`,
          photoUrl: person.avatar_url,
          photoName: person.full_name,
        },
      };
    }

    // Residents and dependants live here: this is an entry for the register, not
    // a visit, so it is never "on-site" and never needs a checkout.
    const checkedInAt = await saveLog(api, {
      estate_id: ctx.estateId,
      security_id: ctx.securityId,
      visitor_name: name,
      method: via,
      entry_type: person.household_access_level ? 'household' : 'resident',
    });
    return {
      changed: checkedInAt !== null,
      result: {
        tone: 'success',
        title: 'Resident verified',
        message: checkedInAt === null ? LOG_FAILED_NOTE : undefined,
        photoUrl: person.avatar_url,
        photoName: person.full_name,
        rows: [
          { label: 'Name', value: name },
          { label: 'Unit', value: person.unit_no ?? 'N/A' },
          { label: 'Entered', value: formatTime(checkedInAt) },
        ],
      },
    };
  }

  // Household / frequent-visitor card: also a standing credential.
  const card = await api.findHouseholdCardByCode(code, ctx.estateId);
  if (card.error) return couldNotVerify();

  if (card.data) {
    const member = card.data;
    if (member.status === 'revoked') {
      return {
        changed: false,
        result: {
          tone: 'error',
          title: 'Access denied',
          message: `${member.full_name}'s access was revoked by the resident.`,
          photoUrl: member.avatar_url,
          photoName: member.full_name,
        },
      };
    }
    if (member.status === 'pending_review') {
      return {
        changed: false,
        result: {
          tone: 'error',
          title: 'Needs review',
          message: `${member.full_name}'s card is due for the resident to review before it can be used again.`,
          photoUrl: member.avatar_url,
          photoName: member.full_name,
        },
      };
    }

    // record_household_member_scan re-checks status='active' itself rather than
    // trusting the branch above, so a card revoked in the moment between the
    // lookup and this call is still denied.
    const scanError = await api.recordHouseholdScan(member.id);
    if (scanError) {
      return {
        changed: false,
        result: {
          tone: 'error',
          title: 'Access denied',
          message: scanError,
          photoUrl: member.avatar_url,
          photoName: member.full_name,
        },
      };
    }
    const checkedInAt = await saveLog(api, {
      estate_id: ctx.estateId,
      security_id: ctx.securityId,
      visitor_name: member.full_name,
      method: via,
      entry_type: 'household',
    });
    return {
      changed: checkedInAt !== null,
      result: {
        tone: 'success',
        title: 'Access granted',
        message: checkedInAt === null ? LOG_FAILED_NOTE : undefined,
        photoUrl: member.avatar_url,
        photoName: member.full_name,
        rows: [
          { label: 'Name', value: member.full_name },
          { label: 'Relationship', value: member.relationship },
          { label: 'Entered', value: formatTime(checkedInAt) },
        ],
      },
    };
  }

  // Visitor pass: single use, inside its validity window.
  const found = await api.findPassByCode(code, ctx.estateId);
  if (found.error) return couldNotVerify();

  const pass = found.data;
  if (!pass) {
    return {
      changed: false,
      result: {
        tone: 'error',
        title: 'Not recognized',
        message: "This code doesn't match a resident ID, household card, or visitor pass for your estate.",
      },
    };
  }

  if (pass.status !== 'pending') {
    return {
      changed: false,
      result: { tone: 'error', title: 'Invalid pass', message: `This pass is already "${pass.status}".` },
    };
  }

  // status='pending' alone does not mean "still inside its window": the expiry
  // job runs periodically, so a lapsed pass can briefly still read 'pending'.
  const at = now();
  if (new Date(pass.valid_until).getTime() < at) {
    return {
      changed: false,
      result: { tone: 'error', title: 'Pass expired', message: `${pass.visitor_name}'s pass can no longer be used.` },
    };
  }
  if (new Date(pass.valid_from).getTime() > at) {
    return {
      changed: false,
      result: { tone: 'error', title: 'Not yet valid', message: `${pass.visitor_name}'s pass isn't valid until later.` },
    };
  }

  const claim = await api.claimPass(pass.id);
  if (claim === 'lost') {
    return {
      changed: false,
      result: {
        tone: 'error',
        title: 'Pass no longer valid',
        message: `${pass.visitor_name}'s pass was just used or cancelled. Do not admit on this code.`,
      },
    };
  }
  if (claim === 'error') {
    return {
      changed: false,
      result: { tone: 'error', title: 'Check-in failed', message: "Couldn't complete the check-in. Try again." },
    };
  }

  const checkedInAt = await saveLog(api, {
    estate_id: ctx.estateId,
    security_id: ctx.securityId,
    pass_id: pass.id,
    visitor_name: pass.visitor_name,
    vehicle_plate: pass.vehicle_plate,
    method: via,
    entry_type: 'visitor',
  });
  return {
    // The pass itself changed even if the register entry could not be saved.
    changed: true,
    result: {
      tone: 'success',
      title: 'Checked in',
      message: checkedInAt === null ? LOG_FAILED_NOTE : undefined,
      rows: [
        { label: 'Name', value: pass.visitor_name },
        ...(pass.vehicle_plate ? [{ label: 'Vehicle', value: pass.vehicle_plate }] : []),
        { label: 'Checked in', value: formatTime(checkedInAt) },
      ],
    },
  };
}

/** The real thing: the same queries the scan screen used to make inline. */
export function createSupabaseGateApi(client: SupabaseClient): GateApi {
  return {
    async findResidentByCode(code, estateId) {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('resident_code', code)
        .eq('estate_id', estateId)
        .eq('role', 'resident')
        .maybeSingle<Profile>();
      return { data: data ?? null, error: !!error };
    },

    async findHouseholdCardByCode(code, estateId) {
      const { data, error } = await client
        .from('household_members')
        .select('*')
        .eq('code', code)
        .eq('estate_id', estateId)
        .maybeSingle<HouseholdMember>();
      return { data: data ?? null, error: !!error };
    },

    async findPassByCode(code, estateId) {
      const { data, error } = await client
        .from('visitor_passes')
        .select('*')
        .eq('code', code)
        .eq('estate_id', estateId)
        .maybeSingle<VisitorPass>();
      return { data: data ?? null, error: !!error };
    },

    async recordHouseholdScan(memberId) {
      const { error } = await client.rpc('record_household_member_scan', { member_id: memberId });
      return error ? friendlyDbError(error) : null;
    },

    async claimPass(passId) {
      // The row only matches while still pending (and RLS requires the same), so
      // zero returned rows means someone else got there first. An RLS-blocked
      // update raises no error, which is why the returned row is what counts.
      const { data, error } = await client
        .from('visitor_passes')
        .update({ status: 'used' })
        .eq('id', passId)
        .eq('status', 'pending')
        .select('id');
      if (error) return 'error';
      return data && data.length === 1 ? 'claimed' : 'lost';
    },

    async insertLog(entry) {
      const { entry_type, ...legacy } = entry;
      // Visitors rely on the column default, so that path is identical to what
      // released builds send. Residents and household members send their type;
      // if the database predates the column, retry without it rather than lose
      // the entry (the server classifies QR scans itself in that case).
      const first = await client
        .from('visitor_logs')
        .insert(entry_type === 'visitor' ? legacy : entry)
        .select('checked_in_at')
        .single();
      if (!first.error) return first.data.checked_in_at as string;

      if (entry_type !== 'visitor' && first.error.code === 'PGRST204') {
        const retry = await client.from('visitor_logs').insert(legacy).select('checked_in_at').single();
        if (!retry.error) return retry.data.checked_in_at as string;
      }
      return null;
    },
  };
}
