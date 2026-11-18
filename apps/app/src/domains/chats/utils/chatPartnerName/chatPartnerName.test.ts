import { describe, expect, it } from 'vitest';
import { chatPartnerName } from './chatPartnerName';

const member = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA2', username: 'sam_k', firstName: null, lastName: null, updatedAt: '2026-01-01T00:00:00.000Z' };

describe('chatPartnerName', () => {
  it('names them, or says "Account unavailable" while they are unavailable', () => {
    expect(chatPartnerName({ ...member, isUnavailable: false })).toBe('@sam_k');
    expect(chatPartnerName({ ...member, isUnavailable: true })).toBe('Account unavailable');
  });
});
