import type { Post } from '@myapp/shared/domains';
import { beforeEach, describe, expect, it } from 'vitest';
import { postStore } from './postStore';

const creator = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA1', username: 'maya', firstName: null, lastName: null };

function post(id: string, overrides: Partial<Post> = {}): Post {
  return {
    id,
    content: 'Hello',
    numSaves: 0,
    numComments: 0,
    numShares: 0,
    numReactions: 0,
    creator,
    viewer: { hasSaved: false },
    createdBy: creator.userId,
    updatedBy: creator.userId,
    createdAt: '2026-11-06T12:00:00.000Z',
    updatedAt: '2026-11-06T12:00:00.000Z',
    ...overrides,
  };
}

describe('postStore', () => {
  beforeEach(() => postStore.reset());

  it('keeps one copy of a post that is in two lists', () => {
    postStore.setPosts([post('a'), post('b')]);
    postStore.updateList('feed', (list) => ({ ...list, ids: ['a', 'b'], hasLoaded: true }));
    postStore.updateList('saves', (list) => ({ ...list, ids: ['b'], hasLoaded: true }));

    postStore.updatePost('b', (p) => ({ ...p, viewer: { hasSaved: true } }));

    expect(postStore.getList('feed').ids).toEqual(['a', 'b']);
    expect(postStore.getList('saves').ids).toEqual(['b']);
    expect(postStore.getPost('b')?.viewer.hasSaved).toBe(true);
  });

  it('returns the previous post so a change can be undone', () => {
    postStore.setPosts([post('a', { numSaves: 1 })]);
    const previous = postStore.updatePost('a', (p) => ({ ...p, numSaves: 2 }));
    postStore.restorePost(previous!);
    expect(postStore.getPost('a')?.numSaves).toBe(1);
  });

  it('replaces objects rather than changing them, so React sees the change', () => {
    postStore.setPosts([post('a')]);
    const before = postStore.getPost('a');
    postStore.updatePost('a', (p) => ({ ...p, numSaves: 1 }));
    expect(postStore.getPost('a')).not.toBe(before);
    expect(before?.numSaves).toBe(0);
  });

  it('gives an empty, unloaded list for a key it has never seen', () => {
    expect(postStore.getList('search:bikes')).toMatchObject({ ids: [], hasLoaded: false });
  });
});
