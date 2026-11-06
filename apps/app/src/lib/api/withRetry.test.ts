import { TRPCClientError } from '@trpc/client';
import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './withRetry';

const refused = () => new TRPCClientError('Post not found', { result: { error: { data: { code: 'NOT_FOUND' } } } as never });

describe('withRetry', () => {
  it('tries again after a network failure', async () => {
    const request = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue('ok');
    await expect(withRetry(request, { baseDelayMs: 0 })).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('gives up after the last attempt', async () => {
    const request = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(withRetry(request, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow('Failed to fetch');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry a refusal", async () => {
    const request = vi.fn().mockRejectedValue(refused());
    await expect(withRetry(request, { baseDelayMs: 0 })).rejects.toThrow('Post not found');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
