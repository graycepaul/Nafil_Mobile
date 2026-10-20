import type { UserRole } from '../types/database';

export const ROLE_HOME: Record<UserRole, string> = {
  resident: '/resident',
  security: '/security',
  admin: '/admin',
  super_admin: '/admin',
  finance: '/admin',
  // Platform developer: no estate, no residents - only the devControl dashboard.
  dev_admin: '/devcontrol',
};

// Only these roles have a dedicated notifications list today - security
// falls back to its home screen rather than a route that doesn't exist yet.
export const ROLE_NOTIFICATIONS: Partial<Record<UserRole, string>> = {
  resident: '/resident/notifications',
  admin: '/admin/notifications',
  super_admin: '/admin/notifications',
  finance: '/admin/notifications',
};

// Same idea for an emergency alert's "View" - security has no announcements
// screen (see AnnouncementsFeed), so it falls back to ROLE_HOME.
export const ROLE_ANNOUNCEMENTS: Partial<Record<UserRole, string>> = {
  resident: '/resident/announcements',
  admin: '/admin/announcements',
  super_admin: '/admin/announcements',
  finance: '/admin/announcements',
};

/**
 * Where tapping a push notification should take someone: an emergency alert to
 * the announcements (or home, if the role has none), anything else to that
 * role's notifications list. Undefined means "stay where you are".
 */
export function notificationTapPath(kind: string | undefined, role: UserRole | undefined): string | undefined {
  if (!role) return undefined;
  if (kind === 'emergency_alert') return ROLE_ANNOUNCEMENTS[role] ?? ROLE_HOME[role] ?? '/';
  return ROLE_NOTIFICATIONS[role];
}
