import { Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'dismissed';

/**
 * Native: the OS share sheet (WhatsApp, SMS, email — anything installed).
 * Web: the Web Share API where available (mobile browsers), otherwise the
 * clipboard, since desktop browsers largely don't implement navigator.share.
 *
 * Either way this is free — the sender's own device sends the message. It is
 * NOT any provider's business messaging API, which bills per conversation and
 * would only be needed to send automatically rather than letting the sender
 * pick a recipient.
 */
export async function shareText(message: string): Promise<ShareOutcome> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ text: message });
        return 'shared';
      } catch {
        return 'dismissed'; // user cancelled the browser sheet
      }
    }
    await Clipboard.setStringAsync(message);
    return 'copied';
  }

  const result = await Share.share({ message });
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}

/**
 * Skips the OS share sheet and opens WhatsApp directly with the message
 * pre-filled, via WhatsApp's own `wa.me` link (works the same on native and
 * web — no recipient number means it just opens WhatsApp/WhatsApp Web with a
 * chat picker, message already in the compose box). Same "the sender's own
 * device sends it" shape as `shareText` — this is a convenience shortcut to
 * one specific app from `shareText`'s full list, not a messaging API call.
 */
export async function shareTextToWhatsApp(message: string): Promise<ShareOutcome> {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(url);
    return 'shared';
  } catch {
    // WhatsApp isn't installed/reachable — fall back to the OS share sheet
    // (or clipboard on web) rather than leaving the resident stuck.
    return shareText(message);
  }
}
