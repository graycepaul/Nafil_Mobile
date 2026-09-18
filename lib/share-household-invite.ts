import { shareText, type ShareOutcome } from './share-text';
import { formatPhoneForDisplay } from './phone';
import type { HouseholdInvite } from '../types/database';

const ACCESS_BLURB: Record<HouseholdInvite['access_level'], string> = {
  full: 'full access',
  visitors_only: 'limited access',
};

export function buildHouseholdInviteMessage(invite: HouseholdInvite, inviterName?: string | null) {
  return [
    `${invite.invitee_name ? `Hi ${invite.invitee_name}, ` : ''}${inviterName ?? 'a member of your household'} has invited you to Nafil Estates with ${ACCESS_BLURB[invite.access_level]}.`,
    '',
    `Your invite code: ${invite.code}`,
    '',
    'Open the app, tap Sign up, then "Use your invite code" and enter it. Sign up with this phone number: ' +
      formatPhoneForDisplay(invite.phone),
  ].join('\n');
}

export async function shareHouseholdInvite(
  invite: HouseholdInvite,
  inviterName?: string | null
): Promise<ShareOutcome> {
  return shareText(buildHouseholdInviteMessage(invite, inviterName));
}
