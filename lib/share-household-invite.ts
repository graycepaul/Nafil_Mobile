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
    'To get started, open the Nafil Estates app, tap Sign up, choose Dependant, and enter your invite code.',
    '',
    `Your account is linked to this phone number: ${formatPhoneForDisplay(invite.phone)}. After you create a password, you can sign in with that number and your password.`,
  ].join('\n');
}

export async function shareHouseholdInvite(
  invite: HouseholdInvite,
  inviterName?: string | null
): Promise<ShareOutcome> {
  return shareText(buildHouseholdInviteMessage(invite, inviterName));
}
