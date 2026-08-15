import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {}

/**
 * Talks to the FastAPI backend (Nafil Backend) — the handful of things that
 * need a server in the loop rather than going straight to Supabase (right
 * now: pushing an emergency alert to residents' phones). Authenticates with
 * the same session Supabase already has; the backend verifies it against
 * Supabase's own JWKS rather than issuing its own tokens.
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      'EXPO_PUBLIC_API_URL is not set. The backend service URL needs to be in .env.'
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new ApiError('Not signed in.');

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}
