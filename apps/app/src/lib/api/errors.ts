import { TRPCClientError } from '@trpc/client';
import { AppErrorThrown } from './results';

/** The API's error code for a failed call, e.g. "NOT_FOUND" or "CONFLICT". */
export function apiErrorCode(error: unknown): string | undefined {
  if (error instanceof TRPCClientError) {
    const data = error.data as { code?: string } | undefined;
    return data?.code;
  }
  return undefined;
}

/** For dependencies whose contract is "null if missing": a not-found becomes null. */
export async function nullIfNotFound<T>(call: Promise<T>): Promise<T | null> {
  try {
    return await call;
  } catch (error) {
    if (apiErrorCode(error) === 'NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

/** True when trying again could work: the request didn't get through, or the server failed. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch() rejects with a TypeError when the request doesn't get through.
    return true;
  }
  if (error instanceof TRPCClientError) {
    const code = apiErrorCode(error);
    return code === undefined || code === 'INTERNAL_SERVER_ERROR';
  }
  return false;
}

/** A message to show for a failure. */
export function errorMessage(error: unknown): string {
  if (error instanceof AppErrorThrown || error instanceof TRPCClientError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return 'Something went wrong';
}
