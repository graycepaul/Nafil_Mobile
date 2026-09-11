import { shareText, shareTextToWhatsApp, type ShareOutcome } from './share-text';
import { shareImage } from './share-image';
import type { VisitorPass } from '../types/database';

export function buildPassMessage(pass: VisitorPass, estateName?: string) {
  const validUntil = new Date(pass.valid_until);
  const expiry = validUntil.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return [
    `Your visitor access code${estateName ? ` for ${estateName}` : ''}:`,
    '',
    pass.code,
    '',
    'This code is valid for a single use only and stops working once security scans it at the gate.',
    `If unused, it expires ${expiry}.`,
    'Show this code to security at the gate.',
  ].join('\n');
}

export type { ShareOutcome };

export async function sharePass(pass: VisitorPass, estateName?: string): Promise<ShareOutcome> {
  return shareText(buildPassMessage(pass, estateName));
}

export async function sharePassToWhatsApp(pass: VisitorPass, estateName?: string): Promise<ShareOutcome> {
  return shareTextToWhatsApp(buildPassMessage(pass, estateName), pass.visitor_phone);
}

/**
 * Shares the pass as a picture (captured by the caller via
 * `react-native-view-shot`) rather than plain text - the whole point of the
 * QR is that security scans it at the gate, and a text-only share (the
 * WhatsApp shortcut above, or `sharePass`'s plain-text fallback) hands the
 * visitor a code with no scannable image at all, since neither the OS share
 * sheet's text mode nor a `wa.me` deep link can carry a QR. Falls back to
 * `sharePass`'s text message if image sharing isn't available.
 */
export async function shareVisitorPassImage(
  imageUri: string,
  pass: VisitorPass,
  estateName?: string
): Promise<ShareOutcome> {
  return shareImage(imageUri, buildPassMessage(pass, estateName), {
    fileName: 'visitor-pass.png',
    dialogTitle: 'Share visitor pass',
  });
}
