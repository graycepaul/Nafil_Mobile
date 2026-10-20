jest.mock('../supabase', () => ({
  supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: { access_token: 'tok' } } })) } },
}));

// The API url is read when the module loads, so it has to be set before it is required.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
/* eslint-disable @typescript-eslint/no-require-imports */
const { REQUEST_TIMEOUT_MS, ApiError, apiDelete, apiGet, apiPost } = require('../api') as typeof import('../api');
const { friendlyDbError } = require('../db-errors') as typeof import('../db-errors');

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});
/** A fetch that never answers on its own but honors abort, like a stalled connection. */
function stalledFetch() {
  return jest.fn((_url: string, init: { signal: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })
  );
}

describe('api client (L16)', () => {
  it('gives up on a stalled request after the timeout with a clear message', async () => {
    jest.useFakeTimers();
    global.fetch = stalledFetch() as never;
    const pending = apiGet('/devcontrol/overview').catch((e) => e);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    const error = await pending;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as Error).message).toMatch(/timed out/);
    expect(friendlyDbError(error)).toMatch(/too long/);
  });

  it('reports a dropped connection in words the app already maps to a friendly message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as never;
    const error = await apiPost('/alerts/broadcast', {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(friendlyDbError(error)).toMatch(/Can’t reach the server/);
  });

  it('still sends auth, JSON body and method, and returns the parsed response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ recipients: 3 }) });
    global.fetch = fetchMock as never;
    expect(await apiPost('/alerts/broadcast', { title: 'x' })).toEqual({ recipients: 3 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/alerts/broadcast');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' });
    expect(init.body).toBe(JSON.stringify({ title: 'x' }));
  });

  it('surfaces the server detail on a failed response, and sends no body on GET or DELETE', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ detail: 'Nope' }) });
    global.fetch = fetchMock as never;
    await expect(apiDelete('/account')).rejects.toThrow('Nope');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' });
  });
});
