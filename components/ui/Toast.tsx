import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';

type Tone = 'error' | 'success';

const TONE_CLASSES: Record<Tone, string> = {
  error: 'bg-danger',
  success: 'bg-success',
};

/**
 * Floating banner anchored near the top of the screen, not inline in
 * scrollable content. `Notice` (the inline version) works for form-level
 * feedback next to the field it's about, but for feedback about an action
 * taken further down a long scrolling screen (e.g. household list), an
 * inline notice at the top of that same scroll view is invisible unless the
 * user happens to already be scrolled up — this renders as a sibling
 * `absolute` overlay instead, same technique as `Overlay`, so it's visible
 * regardless of scroll position. Auto-dismisses so it doesn't need its own
 * close button to go away.
 *
 * `z-[60]` — one above `Overlay`'s `z-50` — so a toast fired while a card
 * modal is open (e.g. from the Share button) still shows on top of the dim
 * backdrop instead of being painted over by it.
 */
export function Toast({
  message,
  tone = 'error',
  onDismiss,
  duration = 4000,
}: {
  message?: string;
  tone?: Tone;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <View className="absolute left-lg right-lg top-lg z-[60]" pointerEvents="box-none">
      <Pressable
        onPress={onDismiss}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        className={`rounded-md px-md py-md shadow-lg ${TONE_CLASSES[tone]}`}
      >
        <Text className="text-center text-[13px] font-semibold text-white">{message}</Text>
      </Pressable>
    </View>
  );
}
