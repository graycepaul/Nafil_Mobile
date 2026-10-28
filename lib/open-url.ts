import { Linking } from 'react-native';

/**
 * Linking.openURL rejects when nothing on the device can handle the URL (no mail
 * app for a mailto:, no browser on a locked-down Android profile). Called bare
 * from a press handler that surfaces as an unhandled promise rejection, so every
 * link goes through here instead. Returns whether the URL was opened.
 */
export async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
