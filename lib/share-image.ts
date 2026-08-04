import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { shareText, type ShareOutcome } from './share-text';

/**
 * Shares a local image (a captured PNG's file:// / data: URI, e.g. from
 * `react-native-view-shot`) through the OS share sheet — WhatsApp included —
 * rather than just the text fallback. Native uses `expo-sharing`, which is
 * the supported way to hand a file to the share sheet in a managed Expo app
 * (RN's own `Share.share` doesn't reliably attach images on Android).
 *
 * Web tries the Web Share API's file support first — it's the only thing
 * that gets a real "choose an app" picker in a browser — but only on a
 * secure origin (HTTPS, or localhost) and only on browsers that implement
 * `canShare({ files })` at all (patchy: good on recent mobile Safari/Chrome,
 * largely absent on desktop). It's also timing-sensitive: `navigator.share()`
 * has to run within the click's user-activation window, and the `await`
 * before this is ever called (capturing the view) can eat that window on
 * strict browsers, making the call silently reject even where the API is
 * otherwise supported. Any of those failure modes fall back to force-
 * downloading the image instead — that always works, and gives the resident
 * a real file to attach in WhatsApp themselves, which beats a share sheet
 * that mostly doesn't appear or a text-only fallback with no photo.
 */
export async function shareImage(uri: string, fallbackMessage: string): Promise<ShareOutcome> {
  if (Platform.OS === 'web') {
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      const blob = await fetch(uri).then((r) => r.blob());
      const file = new File([blob], 'id-card.png', { type: blob.type || 'image/png' });
      if (nav?.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] });
        return 'shared';
      }
    } catch {
      // Not supported, not a secure origin, or the activation window closed
      // — fall through to the download below rather than surface an error.
    }

    try {
      const link = document.createElement('a');
      link.href = uri;
      link.download = 'id-card.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return 'downloaded';
    } catch {
      return shareText(fallbackMessage);
    }
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) return shareText(fallbackMessage);

  try {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share ID card' });
    return 'shared';
  } catch {
    return 'dismissed';
  }
}
