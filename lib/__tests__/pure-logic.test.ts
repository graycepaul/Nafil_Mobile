import { notificationRoute } from '../notification-routes';
import { passwordStrength, validateConfirmation, validateEmail, validatePassword, validatePhone } from '../validation';
import { compareVersions, isVersionBelow } from '../version-compare';
import type { Notification } from '../../types/database';

const note = (type: string, data: Record<string, string> = {}) => ({ type, data }) as unknown as Notification;

describe('notificationRoute', () => {
  it('opens the right detail screen for a role', () => {
    expect(notificationRoute(note('announcement', { announcement_id: 'a1' }), 'resident')).toBe(
      '/resident/announcement-detail?id=a1'
    );
    expect(notificationRoute(note('announcement', { announcement_id: 'a1' }), 'finance')).toBe(
      '/admin/announcement-detail?id=a1'
    );
    expect(notificationRoute(note('issue_reported', { issue_id: 'i1' }), 'admin')).toBe('/admin/issue-detail?id=i1');
  });
  it('stays on the list when the notification carries no id, or has no detail screen', () => {
    expect(notificationRoute(note('announcement'), 'resident')).toBeUndefined();
    expect(notificationRoute(note('join_request_approved'), 'resident')).toBeUndefined();
  });
  it('routes money and onboarding notifications', () => {
    expect(notificationRoute(note('due_assigned'), 'resident')).toBe('/resident/wallet');
    expect(notificationRoute(note('transfer_contested'), 'super_admin')).toBe('/admin/transfers');
    expect(notificationRoute(note('join_request_rejected'), 'resident')).toBe('/onboarding');
  });
});

describe('validation', () => {
  it('checks emails, passwords and confirmation', () => {
    expect(validateEmail('')).toBeDefined();
    expect(validateEmail('nope')).toBeDefined();
    expect(validateEmail(' a@b.com ')).toBeUndefined();
    expect(validatePassword('short')).toBeDefined();
    expect(validatePassword('longenough1')).toBeUndefined();
    expect(validateConfirmation('abc12345', 'abc12346')).toBeDefined();
    expect(validateConfirmation('abc12345', 'abc12345')).toBeUndefined();
  });
  it('accepts any phone-shaped number of 7+ digits', () => {
    expect(validatePhone('')).toBeDefined();
    expect(validatePhone('123456')).toBeDefined();
    expect(validatePhone('+234 803 123 4567')).toBeUndefined();
  });
  it('grades password strength', () => {
    expect(passwordStrength('short').level).toBe('weak');
    expect(passwordStrength('abcdefghij').level).toBe('weak');
    expect(passwordStrength('abcdefg1').level).toBe('fair');
    expect(passwordStrength('Abcdefghij1!').level).toBe('strong');
  });
});

describe('version comparison (forced-update gate)', () => {
  it('orders versions numerically, not as text', () => {
    expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.5', '1.0.5')).toBe(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
  });
  it('blocks only builds below the minimum', () => {
    expect(isVersionBelow('1.0.4', '1.0.5')).toBe(true);
    expect(isVersionBelow('1.0.5', '1.0.5')).toBe(false);
    expect(isVersionBelow('2.0.0', '1.9.9')).toBe(false);
  });
});
