import { Platform, Share } from 'react-native';
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
