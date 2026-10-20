import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/** Long enough for a slow mobile connection and a push broadcast, short enough that a stalled request does not hang the screen. */
export const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {}

/**
 * Talks to the FastAPI backend (Nafil Backend) - the handful of things that
 * need a server in the loop rather than going straight to Supabase (right
 * now: pushing an emergency alert to residents' phones). Authenticates with
 * the same session Supabase already has; the backend verifies it against
 * Supabase's own JWKS rather than issuing its own tokens.
 */
async function request(path: string, init: { method: string; body?: unknown }): Promise<Response> {
  if (!API_URL) {
    throw new ApiError(
      'EXPO_PUBLIC_API_URL is not set. The backend service URL needs to be in .env.'
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new ApiError('Not signed in.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method,
      headers: {
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.');
    }
    // Same wording friendlyDbError already maps to "Can't reach the server".
    throw new ApiError('Network request failed. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Request failed (${res.status})`);
  }
  return res;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, { method: 'POST', body });
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await request(path, { method: 'GET' });
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  await request(path, { method: 'DELETE' });
}
