import type { RefresherEventDetail } from '@ionic/react';
import { useCallback, useEffect, useRef } from 'react';

/** Pulling again sooner than this after a refresh just closes the spinner. */
export const pullToRefreshCooldownMs = 5_000;

/**
 * The handler for an IonRefresher: runs `refresh`, at most once every 5
 * seconds. A pull within that time finishes straight away and keeps what's
 * shown, rather than asking again (or showing an error).
 */
export function usePullToRefresh(refresh: () => Promise<unknown>, { cooldownMs = pullToRefreshCooldownMs }: { cooldownMs?: number } = {}) {
  // The latest refresh, without a new handler each render.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  const lastRefreshAt = useRef<number | null>(null);

  return useCallback(
    (event: CustomEvent<RefresherEventDetail>) => {
      const now = Date.now();
      if (lastRefreshAt.current !== null && now - lastRefreshAt.current < cooldownMs) {
        event.detail.complete();
        return;
      }
      lastRefreshAt.current = now;
      void refreshRef.current()
        .catch(() => undefined)
        .finally(() => event.detail.complete());
    },
    [cooldownMs],
  );
}
