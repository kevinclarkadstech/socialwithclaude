import { useEffect, useRef } from 'react';

/**
 * Calls `poll` every `intervalMs` while `enabled` (e.g. while its screen is
 * the one shown) and the browser tab is visible; once more straight away
 * when the tab comes back. A poll still running is never started again.
 */
export function usePolling(poll: () => Promise<unknown>, { intervalMs, enabled }: { intervalMs: number; enabled: boolean }) {
  // The latest poll, without restarting the timer when the caller re-renders.
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let running = false;
    async function tick() {
      if (running || document.hidden) {
        return;
      }
      running = true;
      try {
        await pollRef.current();
      } catch {
        // The next tick tries again.
      } finally {
        running = false;
      }
    }
    const timer = setInterval(() => void tick(), intervalMs);
    const onVisible = () => {
      if (!document.hidden) {
        void tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, intervalMs]);
}
