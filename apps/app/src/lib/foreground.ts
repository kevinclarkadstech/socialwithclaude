/** Runs `callback` whenever the app comes back to the foreground: a browser tab, or the native app resuming. */
export function onForeground(callback: () => void): () => void {
  const listener = () => {
    if (document.visibilityState === 'visible') {
      callback();
    }
  };
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}
