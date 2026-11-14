import type { Page, Result } from '@myapp/shared/types';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './errors';
import { orThrow } from './results';
import { showErrorToast } from '../toasts';

type FetchPage<T> = (args: { cursor: string | null }) => Promise<Result<Page<T>>>;

export type PagedQueryStatus = 'loading' | 'ready' | 'failed';

/**
 * A list read a page at a time, kept in the component (no entity store): for
 * lists only one screen shows, like follow requests. `fetchPage` should be
 * stable (a module-level function). A first page that fails shows on the
 * page; a later one gets a toast.
 */
export function usePagedQuery<T>(fetchPage: FetchPage<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<PagedQueryStatus>('loading');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const applyFirstPage = useCallback((result: Result<Page<T>> | null) => {
    if (!result?.ok) {
      setStatus('failed');
      return;
    }
    setItems(result.value.items);
    setNextCursor(result.value.nextCursor);
    setStatus('ready');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPage({ cursor: null })
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          applyFirstPage(result);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, applyFirstPage]);

  async function reload() {
    const result = await fetchPage({ cursor: null }).catch(() => null);
    applyFirstPage(result);
  }

  async function loadMore() {
    if (!nextCursor || isLoadingMore) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const result = await fetchPage({ cursor: nextCursor });
      const page = orThrow(result);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      void showErrorToast(errorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  }

  /** Takes items out once they're dealt with, e.g. an accepted request. */
  function remove(shouldRemove: (item: T) => boolean) {
    setItems((current) => current.filter((item) => !shouldRemove(item)));
  }

  return { items, status, hasMore: nextCursor !== null, isLoadingMore, loadMore, reload, remove };
}
