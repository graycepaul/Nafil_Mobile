import { ROLE_HOME, notificationTapPath } from '../role-routes';

describe('notificationTapPath (L15)', () => {
  it('sends an emergency alert to announcements, or home where a role has none', () => {
    expect(notificationTapPath('emergency_alert', 'resident')).toBe('/resident/announcements');
    expect(notificationTapPath('emergency_alert', 'super_admin')).toBe('/admin/announcements');
    expect(notificationTapPath('emergency_alert', 'security')).toBe('/security');
  });
  it('sends everything else to the role notifications list', () => {
    expect(notificationTapPath(undefined, 'resident')).toBe('/resident/notifications');
    expect(notificationTapPath('issue_status', 'finance')).toBe('/admin/notifications');
  });
  it('stays put when the role has no list, or is not known yet (cold start)', () => {
    expect(notificationTapPath('x', 'security')).toBeUndefined();
    expect(notificationTapPath('x', undefined)).toBeUndefined();
    expect(notificationTapPath('emergency_alert', undefined)).toBeUndefined();
  });
  it('gives every role a home, including dev_admin', () => {
    expect(ROLE_HOME.dev_admin).toBe('/devcontrol');
    for (const home of Object.values(ROLE_HOME)) expect(home.startsWith('/')).toBe(true);
  });
});
