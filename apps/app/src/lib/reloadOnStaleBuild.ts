/** Remembers when the page last reloaded for a new build, so a chunk that's really broken doesn't loop. */
const reloadedAtKey = 'reloadedForNewBuildAt';
const retryWithinMs = 10_000;

/**
 * Reloads the page when a part of the app loaded later (a lazy screen, like
 * Admin) can't be fetched: after a deploy, a page opened before it still asks
 * for the old build's file names, which are gone (on Cloudflare, it gets
 * index.html instead). Reloading picks up the new build. If it fails again
 * within 10 seconds of reloading, the error is left to show instead.
 */
export function reloadOnStaleBuild({ storage = window.sessionStorage, reload = () => window.location.reload(), now = Date.now }: {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  reload?: () => void;
  now?: () => number;
} = {}): () => void {
  const listener = (event: Event) => {
    const reloadedAt = Number(storage.getItem(reloadedAtKey) ?? 0);
    if (now() - reloadedAt < retryWithinMs) {
      return;
    }
    // Vite would throw the error; the reload replaces the page instead.
    event.preventDefault();
    storage.setItem(reloadedAtKey, String(now()));
    reload();
  };
  window.addEventListener('vite:preloadError', listener);
  return () => window.removeEventListener('vite:preloadError', listener);
}
