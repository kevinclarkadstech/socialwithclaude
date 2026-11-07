import { describe, expect, it, vi } from 'vitest';
import { notFoundError } from '@myapp/shared/error-handling';
import { fail, succeed } from '@myapp/shared/utils';

const showErrorToast = vi.fn();
vi.mock('../toasts', () => ({ showErrorToast: (message: string) => showErrorToast(message) }));

const { runOrToast } = await import('./runOrToast');

describe('runOrToast', () => {
  it('passes a success through without a toast', async () => {
    showErrorToast.mockClear();
    expect(await runOrToast(async () => succeed(1))).toEqual({ ok: true, value: 1 });
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it('shows a failed Result and passes it through', async () => {
    showErrorToast.mockClear();
    const failed = fail(notFoundError('Post not found'));
    expect(await runOrToast(async () => failed)).toBe(failed);
    expect(showErrorToast).toHaveBeenCalledWith('Post not found');
  });

  it('turns an exception into an unexpected error', async () => {
    showErrorToast.mockClear();
    const result = await runOrToast(async () => {
      throw new TypeError('Failed to fetch');
    });
    const message = "Couldn't reach the server. Check your connection and try again.";
    expect(result).toMatchObject({ ok: false, error: { type: 'unexpected', message } });
    expect(showErrorToast).toHaveBeenCalledWith(message);
  });
});
