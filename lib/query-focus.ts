import { AppState, Platform, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/** Shorter trips (a quick hop to WhatsApp to share a pass) do not refetch everything on return. */
export const MIN_BACKGROUND_MS = 30_000;

type Signal = (focused?: boolean) => void;

/**
 * React Query only knows about browser tab visibility, so on a phone nothing
 * ever refetches when the app comes back to the foreground: lists stay as they
 * were when the person left. This builds the listener that tells it so, but only
 * after the app has been away for MIN_BACKGROUND_MS.
 */
export function createAppStateFocusSetup(
  appState: Pick<typeof AppState, 'addEventListener'>,
  now: () => number = Date.now
) {
  return (signalFocus: Signal) => {
    let leftAt: number | null = null;
    const subscription = appState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        if (leftAt !== null && now() - leftAt >= MIN_BACKGROUND_MS) signalFocus();
        leftAt = null;
      } else if (leftAt === null) {
        leftAt = now();
      }
    });
    return () => subscription.remove();
  };
}

/** Wire React Query's focus detection to the app's foreground state (native only; the browser build already uses tab visibility). */
export function enableAppStateFocus(): void {
  if (Platform.OS === 'web') return;
  focusManager.setEventListener(createAppStateFocusSetup(AppState));
}
