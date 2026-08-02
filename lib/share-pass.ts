import { shareText, type ShareOutcome } from './share-text';
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
    `Valid until ${expiry}.`,
    'Show this code at the gate, or have security scan your QR.',
  ].join('\n');
}

export type { ShareOutcome };

export async function sharePass(pass: VisitorPass, estateName?: string): Promise<ShareOutcome> {
  return shareText(buildPassMessage(pass, estateName));
}
