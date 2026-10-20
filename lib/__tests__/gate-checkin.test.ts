import {
  createSupabaseGateApi,
  performCheckIn,
  type GateApi,
  type LogEntryInput,
} from '../gate-checkin';
import type { HouseholdMember, Profile, VisitorPass } from '../../types/database';

const CTX = { estateId: 'estate-1', securityId: 'guard-1' };
const NOW = new Date('2026-10-20T12:00:00Z').getTime();

function resident(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    full_name: 'Ibrahim Yusuf',
    unit_no: 'B12',
    approved: true,
    household_access_level: null,
    avatar_url: 'https://img/p1.jpg',
    role: 'resident',
    estate_id: 'estate-1',
    ...overrides,
  } as Profile;
}

function card(overrides: Partial<HouseholdMember> = {}): HouseholdMember {
  return {
    id: 'h1',
    full_name: 'Tola Adeyemi',
    relationship: 'Nanny',
    status: 'active',
    avatar_url: 'https://img/h1.jpg',
    ...overrides,
  } as HouseholdMember;
}

function pass(overrides: Partial<VisitorPass> = {}): VisitorPass {
  return {
    id: 'pass-1',
    visitor_name: 'Ade Visitor',
    vehicle_plate: null,
    status: 'pending',
    valid_from: '2026-10-20T08:00:00Z',
    valid_until: '2026-10-20T20:00:00Z',
    ...overrides,
  } as VisitorPass;
}

/** A gate with nothing found and every write succeeding; tests override what they need and read `calls`. */
function fakeApi(overrides: Partial<GateApi> = {}) {
  const calls = { logs: [] as LogEntryInput[], claims: [] as string[], scans: [] as string[], lookups: [] as string[] };
  const api: GateApi = {
    findResidentByCode: async (code) => {
      calls.lookups.push(`resident:${code}`);
      return { data: null, error: false };
    },
    findHouseholdCardByCode: async (code) => {
      calls.lookups.push(`card:${code}`);
      return { data: null, error: false };
    },
    findPassByCode: async (code) => {
      calls.lookups.push(`pass:${code}`);
      return { data: null, error: false };
    },
    recordHouseholdScan: async (id) => {
      calls.scans.push(id);
      return null;
    },
    claimPass: async (id) => {
      calls.claims.push(id);
      return 'claimed';
    },
    insertLog: async (entry) => {
      calls.logs.push(entry);
      return '2026-10-20T12:00:05Z';
    },
    ...overrides,
  };
  return { api, calls };
}

const run = (api: GateApi, code = 'ABC123', via: 'qr' | 'manual' = 'qr') =>
  performCheckIn(api, CTX, code, via, () => NOW);

describe('performCheckIn: residents', () => {
  it('verifies an approved resident and records an entry, not a visit', async () => {
    const { api, calls } = fakeApi({ findResidentByCode: async () => ({ data: resident(), error: false }) });
    const { result, changed } = await run(api);
    expect(result.tone).toBe('success');
    expect(result.title).toBe('Resident verified');
    expect(changed).toBe(true);
    expect(calls.logs).toEqual([
      expect.objectContaining({ visitor_name: 'Ibrahim Yusuf', entry_type: 'resident', method: 'qr' }),
    ]);
    expect(calls.logs[0].pass_id).toBeUndefined();
  });

  it('records a household member profile as a household entry', async () => {
    const { api, calls } = fakeApi({
      findResidentByCode: async () => ({ data: resident({ household_access_level: 'visitors_only' }), error: false }),
    });
    await run(api);
    expect(calls.logs[0].entry_type).toBe('household');
  });

  it('DENIES a revoked household member and writes nothing (H1 regression)', async () => {
    const { api, calls } = fakeApi({
      findResidentByCode: async () => ({ data: resident({ household_access_level: 'revoked' }), error: false }),
    });
    const { result, changed } = await run(api);
    expect(result.tone).toBe('error');
    expect(result.title).toBe('Access denied');
    expect(result.message).toMatch(/revoked/);
    expect(result.photoUrl).toBe('https://img/p1.jpg');
    expect(changed).toBe(false);
    expect(calls.logs).toHaveLength(0);
  });

  it('denies a resident who is not approved', async () => {
    const { api, calls } = fakeApi({ findResidentByCode: async () => ({ data: resident({ approved: false }), error: false }) });
    const { result } = await run(api);
    expect(result.tone).toBe('error');
    expect(calls.logs).toHaveLength(0);
  });

  it('still admits when the register write fails, with a note, retrying once', async () => {
    let attempts = 0;
    const { api } = fakeApi({
      findResidentByCode: async () => ({ data: resident(), error: false }),
      insertLog: async () => {
        attempts += 1;
        return null;
      },
    });
    const { result } = await run(api);
    expect(result.tone).toBe('success');
    expect(result.message).toMatch(/register/);
    expect(attempts).toBe(2);
  });
});

describe('performCheckIn: household cards', () => {
  const withCard = (c: HouseholdMember, extra: Partial<GateApi> = {}) =>
    fakeApi({ findHouseholdCardByCode: async () => ({ data: c, error: false }), ...extra });

  it('grants an active card and records a household entry', async () => {
    const { api, calls } = withCard(card());
    const { result } = await run(api);
    expect(result.title).toBe('Access granted');
    expect(calls.scans).toEqual(['h1']);
    expect(calls.logs[0]).toEqual(expect.objectContaining({ entry_type: 'household', visitor_name: 'Tola Adeyemi' }));
  });

  it('denies revoked and pending-review cards without calling the scan RPC', async () => {
    const revoked = withCard(card({ status: 'revoked' }));
    expect((await run(revoked.api)).result.title).toBe('Access denied');
    const review = withCard(card({ status: 'pending_review' }));
    expect((await run(review.api)).result.title).toBe('Needs review');
    expect(revoked.calls.scans).toHaveLength(0);
    expect(review.calls.scans).toHaveLength(0);
    expect(revoked.calls.logs).toHaveLength(0);
  });

  it('denies and logs nothing when the server refuses the scan', async () => {
    const { api, calls } = withCard(card(), { recordHouseholdScan: async () => 'You don’t have permission to do that.' });
    const { result } = await run(api);
    expect(result.tone).toBe('error');
    expect(calls.logs).toHaveLength(0);
  });
});

describe('performCheckIn: visitor passes', () => {
  const withPass = (p: VisitorPass, extra: Partial<GateApi> = {}) =>
    fakeApi({ findPassByCode: async () => ({ data: p, error: false }), ...extra });

  it('claims the pass first, then logs the visit with its pass id', async () => {
    const order: string[] = [];
    const { api, calls } = withPass(pass(), {
      claimPass: async () => {
        order.push('claim');
        return 'claimed';
      },
      insertLog: async (entry) => {
        order.push('log');
        calls.logs.push(entry);
        return '2026-10-20T12:00:05Z';
      },
    });
    const { result } = await run(api);
    expect(result.tone).toBe('success');
    expect(result.title).toBe('Checked in');
    expect(order).toEqual(['claim', 'log']);
    expect(calls.logs[0]).toEqual(expect.objectContaining({ pass_id: 'pass-1', entry_type: 'visitor' }));
  });

  it('does NOT admit or log when another scan claimed the pass first (H2 regression)', async () => {
    const { api, calls } = withPass(pass(), { claimPass: async () => 'lost' });
    const { result, changed } = await run(api);
    expect(result.tone).toBe('error');
    expect(result.title).toBe('Pass no longer valid');
    expect(changed).toBe(false);
    expect(calls.logs).toHaveLength(0);
  });

  it('reports a failed claim as a failure, not a success', async () => {
    const { api, calls } = withPass(pass(), { claimPass: async () => 'error' });
    const { result } = await run(api);
    expect(result.title).toBe('Check-in failed');
    expect(calls.logs).toHaveLength(0);
  });

  it('keeps the pass used and warns, without retrying, when the visit log fails', async () => {
    let attempts = 0;
    const { api } = withPass(pass(), {
      insertLog: async () => {
        attempts += 1;
        return null;
      },
    });
    const { result, changed } = await run(api);
    expect(result.tone).toBe('success');
    expect(result.message).toMatch(/register/);
    expect(changed).toBe(true);
    expect(attempts).toBe(1);
  });

  it('rejects used, revoked, expired and not-yet-valid passes before claiming', async () => {
    for (const [p, title] of [
      [pass({ status: 'used' }), 'Invalid pass'],
      [pass({ status: 'revoked' }), 'Invalid pass'],
      [pass({ valid_until: '2026-10-20T11:59:00Z' }), 'Pass expired'],
      [pass({ valid_from: '2026-10-20T12:01:00Z' }), 'Not yet valid'],
    ] as const) {
      const { api, calls } = withPass(p);
      expect((await run(api)).result.title).toBe(title);
      expect(calls.claims).toHaveLength(0);
    }
  });
});

describe('performCheckIn: lookups', () => {
  it('says "not recognized" only when every lookup succeeded and found nothing', async () => {
    const { api } = fakeApi();
    expect((await run(api)).result.title).toBe('Not recognized');
  });

  it('never reports a failed lookup as "not recognized" (connection errors)', async () => {
    for (const failing of ['findResidentByCode', 'findHouseholdCardByCode', 'findPassByCode'] as const) {
      const { api, calls } = fakeApi({ [failing]: async () => ({ data: null, error: true }) });
      const { result, changed } = await run(api);
      expect(result.title).toBe("Couldn't check this code");
      expect(changed).toBe(false);
      expect(calls.logs).toHaveLength(0);
      expect(calls.claims).toHaveLength(0);
    }
  });

  it('normalizes the code and rejects an empty one without any lookup', async () => {
    const { api, calls } = fakeApi();
    await run(api, '  ab12cd ');
    expect(calls.lookups[0]).toBe('resident:AB12CD');
    const empty = fakeApi();
    expect((await run(empty.api, '   ')).result.title).toBe('No code entered');
    expect(empty.calls.lookups).toHaveLength(0);
  });
});

/** Minimal chainable stand-in for the Supabase query builder: records every call, resolves with `result`. */
function fakeClient(result: { data?: unknown; error?: { code?: string; message?: string } | null }, insertResults?: typeof result[]) {
  const record: { table?: string; method: string; args: unknown[] }[] = [];
  let insertIndex = 0;
  const builder = (table: string, forInsert = false): unknown => {
    const outcome = forInsert && insertResults ? insertResults[insertIndex++] ?? result : result;
    const proxy: unknown = new Proxy(() => undefined, {
      get(_t, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ error: null, ...outcome });
        return (...args: unknown[]) => {
          record.push({ table, method: prop, args });
          return proxy;
        };
      },
    });
    return proxy;
  };
  return {
    record,
    client: {
      from: (table: string) => ({
        update: (...a: unknown[]) => { record.push({ table, method: 'update', args: a }); return builder(table); },
        insert: (...a: unknown[]) => { record.push({ table, method: 'insert', args: a }); return builder(table, true); },
        select: (...a: unknown[]) => { record.push({ table, method: 'select', args: a }); return builder(table); },
      }),
      rpc: (...a: unknown[]) => { record.push({ method: 'rpc', args: a }); return builder('rpc'); },
    } as never,
  };
}

describe('createSupabaseGateApi', () => {
  it('claimPass requires the row to still be pending and a row back', async () => {
    const lost = fakeClient({ data: [] });
    expect(await createSupabaseGateApi(lost.client).claimPass('pass-1')).toBe('lost');
    expect(lost.record.map((r) => r.method)).toEqual(expect.arrayContaining(['update', 'eq', 'select']));
    expect(lost.record.filter((r) => r.method === 'eq').map((r) => r.args)).toEqual([
      ['id', 'pass-1'],
      ['status', 'pending'],
    ]);

    const won = fakeClient({ data: [{ id: 'pass-1' }] });
    expect(await createSupabaseGateApi(won.client).claimPass('pass-1')).toBe('claimed');

    const broken = fakeClient({ data: null, error: { message: 'boom' } });
    expect(await createSupabaseGateApi(broken.client).claimPass('pass-1')).toBe('error');
  });

  it('insertLog omits entry_type for visitors and sends it for residents', async () => {
    const visitor = fakeClient({ data: { checked_in_at: 't1' } });
    await createSupabaseGateApi(visitor.client).insertLog({
      estate_id: 'e', security_id: 's', visitor_name: 'V', method: 'manual', entry_type: 'visitor',
    });
    expect(visitor.record.find((r) => r.method === 'insert')!.args[0]).not.toHaveProperty('entry_type');

    const res = fakeClient({ data: { checked_in_at: 't2' } });
    expect(
      await createSupabaseGateApi(res.client).insertLog({
        estate_id: 'e', security_id: 's', visitor_name: 'R', method: 'qr', entry_type: 'resident',
      })
    ).toBe('t2');
    expect(res.record.find((r) => r.method === 'insert')!.args[0]).toHaveProperty('entry_type', 'resident');
  });

  it('insertLog retries without entry_type if the database does not have the column yet', async () => {
    const f = fakeClient({ data: { checked_in_at: 't3' } }, [
      { data: null, error: { code: 'PGRST204', message: 'column not found' } },
      { data: { checked_in_at: 't3' } },
    ]);
    const at = await createSupabaseGateApi(f.client).insertLog({
      estate_id: 'e', security_id: 's', visitor_name: 'R', method: 'qr', entry_type: 'resident',
    });
    expect(at).toBe('t3');
    const inserts = f.record.filter((r) => r.method === 'insert');
    expect(inserts).toHaveLength(2);
    expect(inserts[0].args[0]).toHaveProperty('entry_type');
    expect(inserts[1].args[0]).not.toHaveProperty('entry_type');
  });
});
