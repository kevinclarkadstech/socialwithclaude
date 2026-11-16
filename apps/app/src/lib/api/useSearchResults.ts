import type { Page, Result } from '@myapp/shared/types';
import { useEffect, useState } from 'react';
import { errorMessage } from './errors';
import { orThrow } from './results';
import { showErrorToast } from '../toasts';

export type SearchFn<T> = (args: { query: string; cursor: string | null }) => Promise<Result<Page<T>>>;

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'failed';

interface Loaded<T> {
  query: string;
  items: T[];
  nextCursor: string | null;
  failed: boolean;
}

/**
 * Results for `query` (nothing while it's empty), a page at a time. A reply
 * for an older query is dropped, so typing fast never shows stale results.
 * `search` should be stable (a module-level function or useCallback).
 */
export function useSearchResults<T>(search: SearchFn<T>, query: string) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (query === '') {
      return;
    }
    let cancelled = false;
    void search({ query, cursor: null })
      .catch(() => null)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setLoaded(result?.ok
          ? { query, items: result.value.items, nextCursor: result.value.nextCursor, failed: false }
          : { query, items: [], nextCursor: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [search, query]);

  // What's loaded only counts if it's for the query being shown.
  const current = loaded && loaded.query === query ? loaded : null;
  const status: SearchStatus = query === '' ? 'idle' : !current ? 'loading' : current.failed ? 'failed' : 'ready';

  async function loadMore() {
    if (!current?.nextCursor || isLoadingMore) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const page = orThrow(await search({ query, cursor: current.nextCursor }));
      setLoaded((latest) =>
        latest && latest.query === query
          ? { ...latest, items: [...latest.items, ...page.items], nextCursor: page.nextCursor }
          : latest,
      );
    } catch (error) {
      void showErrorToast(errorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return {
    items: status === 'ready' && current ? current.items : [],
    status,
    hasMore: Boolean(current?.nextCursor),
    loadMore,
  };
}
