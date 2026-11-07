import { unexpectedError } from '@myapp/shared/error-handling';
import type { Result } from '@myapp/shared/types';
import { fail } from '@myapp/shared/utils';
import { errorMessage } from './errors';
import { showErrorToast } from '../toasts';

/**
 * Runs an action that has no form to show an error in: a failed Result or
 * an exception becomes a toast. An exception (no network, a server failure)
 * comes back as a failed Result with an "unexpected" error.
 */
export async function runOrToast<T>(action: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    const result = await action();
    if (!result.ok) {
      void showErrorToast(result.error.message ?? 'Something went wrong');
    }
    return result;
  } catch (error) {
    const message = errorMessage(error);
    void showErrorToast(message);
    return fail(unexpectedError(message));
  }
}
