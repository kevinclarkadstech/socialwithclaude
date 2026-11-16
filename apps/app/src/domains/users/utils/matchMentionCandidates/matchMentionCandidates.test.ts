import type { UserProfileSummary } from '@myapp/shared/domains';
import { describe, expect, it } from 'vitest';
import { matchMentionCandidates } from './matchMentionCandidates';

const user = (username: string, firstName: string | null = null, lastName: string | null = null): UserProfileSummary => ({
  userId: username,
  username,
  firstName,
  lastName,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const candidates = [user('maya', 'Maya', 'Lopez'), user('mark_t', 'Mark', 'Thompson'), user('mar'), user('ana_m', 'Ana', 'Martinez'), user('emma')];
const usernames = (users: UserProfileSummary[]) => users.map((u) => u.username);

describe('matchMentionCandidates', () => {
  it('matches the start of a username, first name or last name, ignoring case', () => {
    expect(usernames(matchMentionCandidates({ candidates, query: 'Ma' }))).toEqual(['ana_m', 'mar', 'mark_t', 'maya']);
    expect(usernames(matchMentionCandidates({ candidates, query: 'thom' }))).toEqual(['mark_t']);
  });

  it('puts an exact username first', () => {
    expect(usernames(matchMentionCandidates({ candidates, query: 'mar' }))).toEqual(['mar', 'ana_m', 'mark_t']);
  });

  it('keeps at most `limit`', () => {
    expect(matchMentionCandidates({ candidates, query: 'ma', limit: 2 })).toHaveLength(2);
  });
});
