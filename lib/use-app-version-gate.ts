import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { isVersionBelow } from './version-compare';
import type { AppConfig } from '../types/database';

export type AppVersionGateStatus =
  | { state: 'loading' | 'fine' }
  | { state: 'blocked' | 'nudge'; config: AppConfig };

/**
 * Reads the app_config singleton and compares it against the installed
 * build's version. Runs regardless of auth state (see 0035_app_config.sql's
 * public read policy) so an outdated app is caught even at the login screen.
 */
export function useAppVersionGate(): AppVersionGateStatus {
  const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

  const { data, isLoading } = useQuery({
    queryKey: ['app_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_config').select('*').single();
      if (error) throw error;
      return data as AppConfig;
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading || !data) return { state: 'loading' };

  if (isVersionBelow(currentVersion, data.min_supported_version)) {
    return { state: 'blocked', config: data };
  }
  if (isVersionBelow(currentVersion, data.latest_version)) {
    return { state: 'nudge', config: data };
  }
  return { state: 'fine' };
}
