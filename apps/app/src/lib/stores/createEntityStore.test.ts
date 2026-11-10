import type { Post } from '@myapp/shared/domains';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEntityStore } from './createEntityStore';

const postStore = createEntityStore<Post>();

const creator = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA1', username: 'maya', firstName: null, lastName: null, updatedAt: '2026-11-06T12:00:00.000Z', profileVisibility: 'public' as const };

function post(id: string, overrides: Partial<Post> = {}): Post {
  return {
    id,
    type: 'post',
    content: 'Hello',
    numSaves: 0,
    numComments: 0,
    numShares: 0,
    numReactions: 0,
    media: [],
    creator,
    viewer: { hasSaved: false, followsCreator: false },
    createdBy: creator.userId,
    updatedBy: creator.userId,
    createdAt: '2026-11-06T12:00:00.000Z',
    updatedAt: '2026-11-06T12:00:00.000Z',
    ...overrides,
  };
}

describe('createEntityStore', () => {
  beforeEach(() => postStore.reset());

  it('keeps one copy of a post that is in two lists', () => {
    postStore.setItems([post('a'), post('b')]);
    postStore.updateList('feed', (list) => ({ ...list, ids: ['a', 'b'], hasLoaded: true }));
    postStore.updateList('saves', (list) => ({ ...list, ids: ['b'], hasLoaded: true }));

    postStore.updateItem('b', (p) => ({ ...p, viewer: { ...p.viewer, hasSaved: true } }));

    expect(postStore.getList('feed').ids).toEqual(['a', 'b']);
    expect(postStore.getList('saves').ids).toEqual(['b']);
    expect(postStore.getItem('b')?.viewer.hasSaved).toBe(true);
  });

  it('returns the previous post so a change can be undone', () => {
    postStore.setItems([post('a', { numSaves: 1 })]);
    const previous = postStore.updateItem('a', (p) => ({ ...p, numSaves: 2 }));
    postStore.restoreItem(previous!);
    expect(postStore.getItem('a')?.numSaves).toBe(1);
  });

  it('replaces objects rather than changing them, so React sees the change', () => {
    postStore.setItems([post('a')]);
    const before = postStore.getItem('a');
    postStore.updateItem('a', (p) => ({ ...p, numSaves: 1 }));
    expect(postStore.getItem('a')).not.toBe(before);
    expect(before?.numSaves).toBe(0);
  });

  it('removes a deleted item from every list', () => {
    postStore.setItems([post('a'), post('b')]);
    postStore.updateList('feed', (list) => ({ ...list, ids: ['a', 'b'], hasLoaded: true }));
    postStore.updateList('saves', (list) => ({ ...list, ids: ['a'], hasLoaded: true }));
    postStore.removeItem('a');
    expect(postStore.getItem('a')).toBeUndefined();
    expect(postStore.getList('feed').ids).toEqual(['b']);
    expect(postStore.getList('saves').ids).toEqual([]);
  });

  it('gives an empty, unloaded list for a key it has never seen', () => {
    expect(postStore.getList('search:bikes')).toMatchObject({ ids: [], hasLoaded: false });
  });

  it('changes every item an update changes, and notifies only if something did', () => {
    postStore.setItems([post('a'), post('b')]);
    let notified = 0;
    const unsubscribe = postStore.subscribe(() => {
      notified += 1;
    });
    postStore.updateAll((p) => (p.id === 'b' ? { ...p, content: 'Edited' } : p));
    postStore.updateAll((p) => p);
    unsubscribe();
    expect(postStore.getItem('a')?.content).toBe('Hello');
    expect(postStore.getItem('b')?.content).toBe('Edited');
    expect(notified).toBe(1);
  });
});
