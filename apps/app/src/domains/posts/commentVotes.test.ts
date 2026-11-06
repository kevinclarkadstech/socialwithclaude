import type { PostComment } from '@myapp/shared/domains';
import { describe, expect, it } from 'vitest';
import { nextVote, withVote } from './commentVotes';

const creator = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA1', username: 'sam_k', firstName: null, lastName: null };
const comment = (vote: 1 | -1 | null, numUpVotes: number, numDownVotes: number): PostComment => ({
  id: '01JCCCCCCCCCCCCCCCCCCCCCC1',
  postId: '01JBBBBBBBBBBBBBBBBBBBBBB1',
  content: 'Nice',
  numUpVotes,
  numDownVotes,
  creator,
  viewer: { hasSaved: false, vote },
  createdBy: creator.userId,
  updatedBy: creator.userId,
  createdAt: '2026-11-06T12:00:00.000Z',
  updatedAt: '2026-11-06T12:00:00.000Z',
});

describe('nextVote', () => {
  it('sets the vote, switches it, or removes it when tapped again', () => {
    expect(nextVote(null, 1)).toBe(1);
    expect(nextVote(1, -1)).toBe(-1);
    expect(nextVote(-1, -1)).toBeNull();
  });
});

describe('withVote', () => {
  it('counts a new vote', () => {
    expect(withVote(comment(null, 2, 0), 1)).toMatchObject({ numUpVotes: 3, numDownVotes: 0, viewer: { vote: 1 } });
  });
  it('moves a vote from up to down', () => {
    expect(withVote(comment(1, 3, 1), -1)).toMatchObject({ numUpVotes: 2, numDownVotes: 2, viewer: { vote: -1 } });
  });
  it('takes a removed vote off the count', () => {
    expect(withVote(comment(-1, 0, 2), null)).toMatchObject({ numUpVotes: 0, numDownVotes: 1, viewer: { vote: null } });
  });
});
