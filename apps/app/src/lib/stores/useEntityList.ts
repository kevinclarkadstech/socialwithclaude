import type { Page } from '@myapp/shared/types';
import type { Result } from '@myapp/shared/types';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { errorMessage } from '../api/errors';
import { orThrow } from '../api/results';
import { showErrorToast } from '../toasts';
import type { EntityStore } from './createEntityStore';

type FetchPage<T> = (args: { cursor: string | null }) => Promise<Result<Page<T>>>;

// One request per list at a time, however many components ask.
const inFlight = new Map<string, Promise<void>>();

async function loadPage<T extends { id: string }>(
  store: EntityStore<T>,
  key: string,
  fetchPage: FetchPage<T>,
  { fromStart }: { fromStart: boolean },
) {
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }
  const cursor = fromStart ? null : store.getList(key).nextCursor;
  store.updateList(key, (list) => ({ ...list, isLoading: true }));

  const request = fetchPage({ cursor })
    .then((result) => {
      const page = orThrow(result);
      store.setItems(page.items);
      const ids = page.items.map((item) => item.id);
      store.updateList(key, (list) => ({
        ids: fromStart ? ids : [...list.ids, ...ids.filter((id) => !list.ids.includes(id))],
        nextCursor: page.nextCursor,
        hasLoaded: true,
        isLoading: false,
        error: null,
      }));
    })
    .catch((error: unknown) => {
      store.updateList(key, (list) => ({ ...list, isLoading: false, error: list.hasLoaded ? null : error }));
      // A first page that fails shows on the page itself; a later one gets a toast.
      if (store.getList(key).hasLoaded) {
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
 * A list of entities, a page at a time, kept in `store` under `key`. Loads
 * the first page when first shown (unless `enabled` is false). Returns ids:
 * each item reads itself from the store, so a change to one re-renders only it.
 */
export function useEntityList<T extends { id: string }>(
  store: EntityStore<T>,
  key: string,
  fetchPage: FetchPage<T>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const list = useSyncExternalStore(store.subscribe, () => store.getList(key));

  useEffect(() => {
    if (enabled && !list.hasLoaded && !list.isLoading && !list.error) {
      void loadPage(store, key, fetchPage, { fromStart: true });
    }
  }, [store, key, fetchPage, enabled, list.hasLoaded, list.isLoading, list.error]);

  const loadMore = useCallback(async () => {
    if (store.getList(key).nextCursor) {
      await loadPage(store, key, fetchPage, { fromStart: false });
    }
  }, [store, key, fetchPage]);

  const refresh = useCallback(() => loadPage(store, key, fetchPage, { fromStart: true }), [store, key, fetchPage]);

  return {
    ids: list.ids,
    isLoading: list.isLoading && !list.hasLoaded,
    error: list.error,
    hasMore: list.nextCursor !== null,
    loadMore,
    refresh,
  };
}
