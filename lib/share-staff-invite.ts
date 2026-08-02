import { shareText, type ShareOutcome } from './share-text';
import type { StaffInvite } from '../types/database';

export function buildStaffInviteMessage(invite: StaffInvite, estateName?: string) {
  return [
    `You've been invited to join${estateName ? ` ${estateName}` : ' your estate'} on Nafil Estates as ${invite.role}.`,
    '',
    `Your invite code: ${invite.code}`,
    '',
    'Open the app → Sign up → Security & Staff → "I have an invite code", and enter it there.',
  ].join('\n');
}

export async function shareStaffInvite(invite: StaffInvite, estateName?: string): Promise<ShareOutcome> {
  return shareText(buildStaffInviteMessage(invite, estateName));
}
