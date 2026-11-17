import { describe, expect, it } from 'vitest';
import { chatPartnerName } from './chatPartnerName';

const member = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA2', username: 'sam_k', firstName: null, lastName: null, updatedAt: '2026-01-01T00:00:00.000Z' };

describe('chatPartnerName', () => {
  it('names them, or says they are unavailable while banned', () => {
    expect(chatPartnerName({ ...member, isBanned: false })).toBe('@sam_k');
    expect(chatPartnerName({ ...member, isBanned: true })).toBe('Account unavailable');
  });
});
