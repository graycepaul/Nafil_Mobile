import { shareTextToWhatsApp, type ShareOutcome } from './share-text';
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

/**
 * Direct-to-WhatsApp shortcut, text-only - a `wa.me` deep link can never
 * carry a file, so this can't include the QR image. Kept anyway: a direct
 * WhatsApp button is a real requirement here regardless of that limitation.
 * The code in the message still works at the gate either way - security's
 * scan screen accepts it typed in by hand, not only scanned - so this isn't
 * a broken share, just one that needs the visitor (or security) to read the
 * code rather than scan it. Use `shareVisitorPassImage` when a scannable
 * result specifically matters more than reaching WhatsApp directly.
 */
export async function sharePassToWhatsApp(pass: VisitorPass, estateName?: string): Promise<ShareOutcome> {
  return shareTextToWhatsApp(buildPassMessage(pass, estateName), pass.visitor_phone);
}

/**
 * Shares the pass as a picture (captured by the caller via
 * `react-native-view-shot`) rather than plain text - the whole point of the
 * QR is that security scans it at the gate, and a text-only share hands the
 * visitor a code with no scannable image at all. Falls back to a text
 * message if image sharing isn't available at all.
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
