import { isRetryable } from './errors';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `request`, trying again with a growing delay when it fails in a way
 * that might succeed later (no connection, a server error). A refusal like a
 * 403 or 404 fails right away.
 */
export async function withRetry<T>(
  request: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) {
        throw error;
      }
      await wait(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
