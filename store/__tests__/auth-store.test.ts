import { queryClient } from '../../lib/query-client';
import { useAuthStore } from '../auth-store';

const calls: string[] = [];

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(async () => {
        calls.push('auth.signOut');
        return { error: null };
      }),
      getSession: jest.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockUnregister = jest.fn(async () => {
  calls.push('unregisterThisDevice');
});
jest.mock('../../lib/push-notifications', () => ({
  unregisterThisDevice: () => mockUnregister(),
}));

beforeEach(() => {
  calls.length = 0;
  mockUnregister.mockClear();
  queryClient.setQueryData(['announcements'], [{ id: 'previous-users-data' }]);
  useAuthStore.setState({
    session: { user: { id: 'u1' }, access_token: 't' } as never,
    profile: { id: 'u1', role: 'resident' } as never,
    profileError: false,
  });
});

describe('signOut (M4)', () => {
  it("stops this device getting the account's pushes BEFORE the session is destroyed", async () => {
    await useAuthStore.getState().signOut();
    expect(calls).toEqual(['unregisterThisDevice', 'auth.signOut']);
  });

  it("clears the cache so the next user never sees the previous user's data", async () => {
    expect(queryClient.getQueryData(['announcements'])).toBeDefined();
    await useAuthStore.getState().signOut();
    expect(queryClient.getQueryData(['announcements'])).toBeUndefined();
  });

  it('resets the store state', async () => {
    await useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.profileError).toBe(false);
  });
});
