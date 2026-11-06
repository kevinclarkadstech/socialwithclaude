import type { AppError } from '@myapp/shared/error-handling';
import type { Result } from '@myapp/shared/types';
import { logger } from './logger';

/** A failed Result, thrown so TanStack Query treats it as an error. */
export class AppErrorThrown extends Error {
  constructor(public readonly appError: AppError) {
    super(appError.message ?? appError.type);
    this.name = 'AppErrorThrown';
  }
}

type Operation<Input, Output, Dependencies> = (args: {
  input: Input;
  context: { logger: typeof logger };
  dependencies: Dependencies;
}) => Promise<Result<Output>>;

/**
 * Runs a shared query or mutation on the client, with the given (tRPC-backed)
 * dependencies. Returns its Result, for screens that show an expected failure
 * themselves, like a taken username.
 */
export function runOperation<Input, Output, Dependencies>(
  operation: Operation<Input, Output, Dependencies>,
  input: Input,
  dependencies: Dependencies,
): Promise<Result<Output>> {
  return operation({ input, context: { logger }, dependencies });
}

/** Like runOperation, but returns the value and throws a failure (for TanStack Query). */
export async function runOperationOrThrow<Input, Output, Dependencies>(
  operation: Operation<Input, Output, Dependencies>,
  input: Input,
  dependencies: Dependencies,
): Promise<Output> {
  const result = await runOperation(operation, input, dependencies);
  if (!result.ok) {
    throw new AppErrorThrown(result.error);
  }
  return result.value;
}

/** A Result as tRPC returns it: JSON drops `value` when it's undefined. */
type ApiResult<T> = { ok: true; value?: T } | { ok: false; error: AppError };

/**
 * The value of a tRPC call. The API turns failed Results into errors, so a
 * call that returns has succeeded.
 */
export async function fromApi<T>(call: Promise<ApiResult<T>>): Promise<T> {
  const result = await call;
  if (!result.ok) {
    throw new AppErrorThrown(result.error);
  }
  return result.value as T;
}
