import { formatBytes, formatDuration, roleLabel } from '../devcontrol-format';

describe('devcontrol-format', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(512 * 1024)).toBe('512 KB');
    expect(formatBytes(14_732_435)).toBe('14.0 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.00 GB');
  });

  it('formats durations', () => {
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(3 * 3600 + 5 * 60)).toBe('3h 5m');
    expect(formatDuration(2 * 86400 + 4 * 3600)).toBe('2d 4h');
  });

  it('labels roles, including the new dev_admin role', () => {
    expect(roleLabel('dev_admin')).toBe('Dev admin');
    expect(roleLabel('super_admin')).toBe('Super admin');
    expect(roleLabel(null)).toBe('None');
  });
});
