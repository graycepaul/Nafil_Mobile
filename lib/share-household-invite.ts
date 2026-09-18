import { shareText, type ShareOutcome } from './share-text';
import type { HouseholdInvite } from '../types/database';

const ACCESS_BLURB: Record<HouseholdInvite['access_level'], string> = {
  full: 'full access to the app',
  visitors_only: 'access to visitor passes and the marketplace',
};

export function buildHouseholdInviteMessage(invite: HouseholdInvite, inviterName?: string | null) {
  return [
    `${inviterName ?? 'A member of your household'} has invited you to Nafil Estates with ${ACCESS_BLURB[invite.access_level]}.`,
    '',
    `Your invite code: ${invite.code}`,
    '',
    'Open the app → Sign up → Resident → "Invited to a household? Use your invite code", and enter it there. Use this email address when you sign up: ' +
      invite.email,
  ].join('\n');
}

export async function shareHouseholdInvite(
  invite: HouseholdInvite,
  inviterName?: string | null
): Promise<ShareOutcome> {
  return shareText(buildHouseholdInviteMessage(invite, inviterName));
}
