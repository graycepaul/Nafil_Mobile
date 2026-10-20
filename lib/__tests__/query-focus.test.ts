import { MIN_BACKGROUND_MS, createAppStateFocusSetup } from '../query-focus';

function harness() {
  let listener!: (state: string) => void;
  let removed = false;
  const appState = {
    addEventListener: (_: 'change', fn: (state: never) => void) => {
      listener = fn as never;
      return { remove: () => { removed = true; } };
    },
  };
  let time = 1_000_000;
  const signal = jest.fn();
  const cleanup = createAppStateFocusSetup(appState as never, () => time)(signal);
  return { signal, cleanup, isRemoved: () => removed, send: (s: string) => listener(s), advance: (ms: number) => { time += ms; } };
}

describe('createAppStateFocusSetup (M15)', () => {
  it('refetches (signals focus) after a long time in the background', () => {
    const h = harness();
    h.send('background');
    h.advance(MIN_BACKGROUND_MS + 1);
    h.send('active');
    expect(h.signal).toHaveBeenCalledTimes(1);
  });

  it('does not refetch after a quick app switch', () => {
    const h = harness();
    h.send('inactive');
    h.advance(5_000);
    h.send('active');
    expect(h.signal).not.toHaveBeenCalled();
  });

  it('measures from the first time the app left, even through inactive then background', () => {
    const h = harness();
    h.send('inactive');
    h.advance(20_000);
    h.send('background');
    h.advance(20_000);
    h.send('active');
    expect(h.signal).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh timer for each trip', () => {
    const h = harness();
    h.send('background');
    h.advance(MIN_BACKGROUND_MS + 1);
    h.send('active');
    h.send('background');
    h.advance(1_000);
    h.send('active');
    expect(h.signal).toHaveBeenCalledTimes(1);
  });

  it('ignores an active event when the app never left, and cleans up its listener', () => {
    const h = harness();
    h.send('active');
    expect(h.signal).not.toHaveBeenCalled();
    h.cleanup();
    expect(h.isRemoved()).toBe(true);
  });
});
