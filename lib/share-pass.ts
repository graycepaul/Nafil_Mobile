import { type ShareOutcome } from './share-text';
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
 * Shares the pass as a picture (captured by the caller via
 * `react-native-view-shot`) rather than plain text - the whole point of the
 * QR is that security scans it at the gate, and a text-only share hands the
 * visitor a code with no scannable image at all. There's deliberately no
 * WhatsApp-direct-link shortcut for this (unlike some other share flows in
 * this app) - a `wa.me` deep link can only carry text, never a file, so it
 * can never produce a scannable result; going through the OS share sheet
 * (which lets the sender pick WhatsApp themselves) is the only path that
 * actually attaches the image. Falls back to a text message if image
 * sharing isn't available at all.
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
