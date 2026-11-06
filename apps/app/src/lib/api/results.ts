import type { AppError } from '@myapp/shared/error-handling';
import type { Result } from '@myapp/shared/types';

/** A failed Result, thrown where a caller needs an exception rather than a Result. */
export class AppErrorThrown extends Error {
  constructor(public readonly appError: AppError) {
    super(appError.message ?? appError.type);
    this.name = 'AppErrorThrown';
  }
}

/** The value of a successful Result; throws AppErrorThrown for a failed one. */
export function orThrow<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new AppErrorThrown(result.error);
  }
  return result.value;
}

/**
 * The value of a tRPC call. The API turns failed Results into errors (the
 * call throws), so one that returns has succeeded.
 */
export async function fromApi<T>(call: Promise<Result<T>>): Promise<T> {
  return orThrow(await call);
}
