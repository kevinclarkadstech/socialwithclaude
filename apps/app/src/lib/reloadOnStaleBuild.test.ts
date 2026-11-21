import { afterEach, describe, expect, it, vi } from 'vitest';
import { reloadOnStaleBuild } from './reloadOnStaleBuild';

function memoryStorage() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) };
}

const failLoadingChunk = () => {
  const event = new Event('vite:preloadError', { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('reloadOnStaleBuild', () => {
  let stop = () => {};
  afterEach(() => stop());

  it('reloads once when a chunk fails to load, and lets the error show if it fails again straight after', () => {
    let time = 100_000;
    const reload = vi.fn();
    const storage = memoryStorage();
    stop = reloadOnStaleBuild({ storage, reload, now: () => time });

    expect(failLoadingChunk().defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    // The reloaded page fails too: no loop.
    time += 3_000;
    expect(failLoadingChunk().defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    // A later deploy, much later: reloads again.
    time += 60_000;
    failLoadingChunk();
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
