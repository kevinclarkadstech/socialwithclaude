import { TRPCClientError } from '@trpc/client';
import { AppErrorThrown } from './runOperation';

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

/** A message to show for an unexpected failure. */
export function errorMessage(error: unknown): string {
  if (error instanceof AppErrorThrown || error instanceof TRPCClientError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    // fetch() rejects with a TypeError when the request doesn't get through.
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return 'Something went wrong';
}
