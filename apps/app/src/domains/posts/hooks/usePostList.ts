import type { Page } from '@myapp/shared/common';
import type { Post } from '@myapp/shared/domains';
import type { Result } from '@myapp/shared/types';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { errorMessage } from '../../../lib/api/errors';
import { orThrow } from '../../../lib/api/results';
import { showErrorToast } from '../../../lib/toasts';
import { postStore } from '../postStore';

type FetchPage = (args: { cursor: string | null }) => Promise<Result<Page<Post>>>;

// One request per list at a time, however many components ask.
const inFlight = new Map<string, Promise<void>>();

async function loadPage(key: string, fetchPage: FetchPage, { fromStart }: { fromStart: boolean }) {
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }
  const cursor = fromStart ? null : postStore.getList(key).nextCursor;
  postStore.updateList(key, (list) => ({ ...list, isLoading: true }));

  const request = fetchPage({ cursor })
    .then((result) => {
      const page = orThrow(result);
      postStore.setPosts(page.items);
      const ids = page.items.map((post) => post.id);
      postStore.updateList(key, (list) => ({
        ids: fromStart ? ids : [...list.ids, ...ids.filter((id) => !list.ids.includes(id))],
        nextCursor: page.nextCursor,
        hasLoaded: true,
        isLoading: false,
        error: null,
      }));
    })
    .catch((error: unknown) => {
      postStore.updateList(key, (list) => ({ ...list, isLoading: false, error: list.hasLoaded ? null : error }));
      // A first page that fails shows on the page itself; a later one gets a toast.
      if (postStore.getList(key).hasLoaded) {
        void showErrorToast(errorMessage(error));
      }
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

/**
 * A list of posts, a page at a time, kept in postStore under `key`. Loads
 * the first page when first shown. Returns ids: each card reads its own
 * post with usePost, so a change to one post re-renders only that card.
 */
export function usePostList(key: string, fetchPage: FetchPage) {
  const list = useSyncExternalStore(postStore.subscribe, () => postStore.getList(key));

  useEffect(() => {
    if (!list.hasLoaded && !list.isLoading && !list.error) {
      void loadPage(key, fetchPage, { fromStart: true });
    }
  }, [key, fetchPage, list.hasLoaded, list.isLoading, list.error]);

  const loadMore = useCallback(async () => {
    if (postStore.getList(key).nextCursor) {
      await loadPage(key, fetchPage, { fromStart: false });
    }
  }, [key, fetchPage]);

  const refresh = useCallback(() => loadPage(key, fetchPage, { fromStart: true }), [key, fetchPage]);

  return {
    postIds: list.ids,
    isLoading: list.isLoading && !list.hasLoaded,
    error: list.error,
    hasMore: list.nextCursor !== null,
    loadMore,
    refresh,
  };
}
