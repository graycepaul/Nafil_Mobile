import { QueryClient } from '@tanstack/react-query';
import { enableAppStateFocus } from './query-focus';

// Refetch active lists when the app returns after a while away (native only).
enableAppStateFocus();

/** One shared client so sign-out can clear it (the cache must not outlive the user who loaded it). */
export const queryClient = new QueryClient();
