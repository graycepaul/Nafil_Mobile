import { QueryClient } from '@tanstack/react-query';

/** One shared client so sign-out can clear it (the cache must not outlive the user who loaded it). */
export const queryClient = new QueryClient();
