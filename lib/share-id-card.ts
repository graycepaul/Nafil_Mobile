import { shareText, type ShareOutcome } from './share-text';
import { shareImage } from './share-image';
import type { HouseholdMember } from '../types/database';

export function buildHouseholdCardMessage(member: HouseholdMember, estateName?: string) {
  return [
    `${member.full_name}'s gate access code${estateName ? ` for ${estateName}` : ''}:`,
    '',
    member.code,
    '',
    `Standing access as ${member.relationship.toLowerCase()}. No expiry, until the resident revokes it.`,
    'Show this code, or the QR on their card, at the gate.',
  ].join('\n');
}

export type { ShareOutcome };

export async function shareHouseholdCard(member: HouseholdMember, estateName?: string): Promise<ShareOutcome> {
  return shareText(buildHouseholdCardMessage(member, estateName));
}

/**
 * Shares the card as a picture (captured by the caller via
 * `react-native-view-shot`) rather than plain text — the whole point of a
 * frequent-visitor card is that it has the member's photo on it for security
 * to check against their face, and a code alone loses that. Falls back to
 * `shareHouseholdCard`'s text message if image sharing isn't available.
 */
export async function shareHouseholdCardImage(
  imageUri: string,
  member: HouseholdMember,
  estateName?: string
): Promise<ShareOutcome> {
  return shareImage(imageUri, buildHouseholdCardMessage(member, estateName));
}
