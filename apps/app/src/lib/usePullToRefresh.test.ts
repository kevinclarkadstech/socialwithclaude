import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePullToRefresh } from './usePullToRefresh';

function pull(handler: ReturnType<typeof usePullToRefresh>) {
  const complete = vi.fn();
  handler({ detail: { complete } } as unknown as Parameters<typeof handler>[0]);
  return complete;
}

describe('usePullToRefresh', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('refreshes, then only closes the spinner for pulls within 5 seconds', async () => {
    const refresh = vi.fn(async () => {});
    const { result } = renderHook(() => usePullToRefresh(refresh));

    const first = pull(result.current);
    await vi.waitFor(() => expect(first).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(4_000);
    const tooSoon = pull(result.current);
    expect(tooSoon).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_000);
    pull(result.current);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('closes the spinner when the refresh fails', async () => {
    const { result } = renderHook(() => usePullToRefresh(async () => { throw new Error('offline'); }));
    const complete = pull(result.current);
    await vi.waitFor(() => expect(complete).toHaveBeenCalled());
  });
});
