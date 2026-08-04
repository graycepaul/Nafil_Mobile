import { shareText, type ShareOutcome } from './share-text';
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
