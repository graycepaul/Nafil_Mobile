import { buildPassMessage } from '../share-pass';
import type { VisitorPass } from '../../types/database';

const BASE_PASS: VisitorPass = {
  id: 'pass-1',
  estate_id: 'estate-1',
  resident_id: 'resident-1',
  visitor_name: 'Ada Johnson',
  visitor_phone: null,
  vehicle_plate: null,
  code: 'ABC123',
  status: 'pending',
  valid_until: '2026-01-15T14:00:00Z',
  created_at: '2026-01-15T10:00:00Z',
} as VisitorPass;

describe('buildPassMessage', () => {
  it('includes the code and single-use/expiry language', () => {
    const message = buildPassMessage(BASE_PASS);
    expect(message).toContain('ABC123');
    expect(message).toContain('single use only');
    expect(message).toContain('If unused, it expires');
  });

  it('includes the estate name when provided', () => {
    const message = buildPassMessage(BASE_PASS, 'Green Court Estate');
    expect(message).toContain('for Green Court Estate');
  });

  it('omits the estate clause when not provided', () => {
    const message = buildPassMessage(BASE_PASS);
    expect(message.split('\n')[0]).toBe('Your visitor access code:');
  });
});
