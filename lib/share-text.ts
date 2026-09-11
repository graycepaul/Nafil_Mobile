import { Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'dismissed';

/**
 * Native: the OS share sheet (WhatsApp, SMS, email - anything installed).
 * Web: the Web Share API where available (mobile browsers), otherwise the
 * clipboard, since desktop browsers largely don't implement navigator.share.
 *
 * Either way this is free - the sender's own device sends the message. It is
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
 * WhatsApp's `wa.me/<number>` deep link needs the number in plain
 * international format: digits only, country code, no leading `0` trunk
 * prefix. Numbers collected in this app are typically Nigerian local format
 * (e.g. "0801 234 5678"), so a bare 11-digit number starting with 0 is
 * assumed to be that and gets 234 substituted for the leading 0. Anything
 * else (already has a country code, or came in some other shape) is passed
 * through as digits-only and left to WhatsApp to resolve.
 */
export function normalizePhoneForWhatsApp(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.length === 11 && digits.startsWith('0')) {
    return `234${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Skips the OS share sheet and opens WhatsApp directly with the message
 * pre-filled, via WhatsApp's own `wa.me` link (works the same on native and
 * web). Passing `phone` opens that contact's chat directly; omitting it
 * falls back to WhatsApp's chat picker with the message pre-filled. Same
 * "the sender's own device sends it" shape as `shareText` - this is a
 * convenience shortcut to one specific app from `shareText`'s full list,
 * not a messaging API call.
 *
 * Text-only, unavoidably: a `wa.me` link can only pre-fill text, never
 * attach a file, so this can never carry the QR image - that's a WhatsApp
 * platform limit, not something fixable here. The visitor pass screen keeps
 * this alongside its image-based share specifically because the client
 * needs a direct-to-WhatsApp shortcut regardless; the plain code shown in
 * this message still works at the gate (security can enter it manually,
 * not only scan it), it just isn't a scannable QR through this specific path.
 */
export async function shareTextToWhatsApp(
  message: string,
  phone?: string | null
): Promise<ShareOutcome> {
  const normalized = phone ? normalizePhoneForWhatsApp(phone) : undefined;
  const url = `https://wa.me/${normalized ?? ''}?text=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(url);
    return 'shared';
  } catch {
    // WhatsApp isn't installed/reachable - fall back to the OS share sheet
    // (or clipboard on web) rather than leaving the resident stuck.
    return shareText(message);
  }
}
