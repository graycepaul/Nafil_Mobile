import type { Notification, UserRole } from '../types/database';

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'finance'];

/**
 * Where tapping a notification should take you, based on its type and the
 * id its trigger stashed in `data` (see the jsonb_build_object calls across
 * 0012/0013/0017/0020/0024/0027_*.sql for the exact key each type uses).
 * Returns undefined for a type with no specific detail screen to land on -
 * the caller should just leave the user on the notifications list.
 */
export function notificationRoute(item: Notification, role: UserRole | undefined): string | undefined {
  const d = item.data as Record<string, string | undefined>;
  const isAdmin = role ? ADMIN_ROLES.includes(role) : false;

  switch (item.type) {
    // Emergency alerts are announcements too (severity: 'emergency') - the
    // trigger that creates this notification stashes the same
    // announcement_id either way (0012_notifications.sql), so both land on
    // the same detail screen.
    case 'announcement':
    case 'emergency':
      return d.announcement_id
        ? `/${isAdmin ? 'admin' : 'resident'}/announcement-detail?id=${d.announcement_id}`
        : undefined;
    case 'issue_status':
      return d.issue_id ? `/resident/issue-detail?id=${d.issue_id}` : undefined;
    case 'issue_reported':
      return d.issue_id ? `/admin/issue-detail?id=${d.issue_id}` : undefined;
    case 'issue_feedback':
      return d.issue_id
        ? `/${isAdmin ? 'admin' : 'resident'}/issue-detail?id=${d.issue_id}`
        : undefined;
    case 'visitor_pass_used':
      return '/resident/visitor-pass-history';
    case 'staff_invite_accepted':
      return '/admin/staff';
    case 'household_member_scanned':
      return '/resident/profile';
    case 'order_placed':
    case 'order_completed':
      return '/resident/store';
    case 'transfer_confirmed':
    case 'transfer_rejected':
      return '/resident/wallet-transactions';
    case 'transfer_contested':
      return '/admin/transfers';
    case 'due_assigned':
      return '/resident/wallet';
    case 'listing_suspended':
    case 'listing_reinstated':
      return d.listing_id
        ? `/${isAdmin ? 'admin' : 'resident'}/marketplace-listing?id=${d.listing_id}`
        : undefined;
    case 'join_request_submitted':
      return '/admin/residents?tab=pending';
    case 'join_request_rejected':
      // Routes through the onboarding router rather than straight to
      // join-estate - it re-checks the latest request itself and is what
      // every other onboarding entry point already goes through.
      return '/onboarding';
    // 'join_request_approved' has no detail screen of its own - the
    // resident's estate assignment is already visible on Home once approved.
    default:
      return undefined;
  }
}
