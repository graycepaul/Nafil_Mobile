import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './api';
import { useAuthStore } from '../store/auth-store';
import { useDevControlStore } from '../store/devcontrol-store';
import type { DevEstate, DevOverview, DevUser } from '../types/devcontrol';

export function useDevOverview() {
  const scope = useDevControlStore((s) => s.scope);
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['devcontrol_overview', scope],
    queryFn: () => apiGet<DevOverview>(`/devcontrol/overview?scope=${scope}`),
    enabled: profile?.role === 'dev_admin',
  });
}

export function useDevEstates() {
  const scope = useDevControlStore((s) => s.scope);
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['devcontrol_estates', scope],
    queryFn: () => apiGet<DevEstate[]>(`/devcontrol/estates?scope=${scope}`),
    enabled: profile?.role === 'dev_admin',
  });
}

export function useDevUsers() {
  const scope = useDevControlStore((s) => s.scope);
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['devcontrol_users', scope],
    queryFn: () => apiGet<DevUser[]>(`/devcontrol/users?scope=${scope}`),
    enabled: profile?.role === 'dev_admin',
  });
}

/** Moves one user or estate into (test=true) or out of (test=false) the test view, then refreshes every devControl query. */
export function useSetTestFlag() {
  const queryClient = useQueryClient();
  return async (kind: 'user' | 'estate', id: string, test: boolean) => {
    await apiPost('/devcontrol/flags', { kind, id, test });
    await queryClient.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('devcontrol_'),
    });
  };
}
