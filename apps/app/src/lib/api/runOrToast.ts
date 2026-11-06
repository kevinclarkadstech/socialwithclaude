import type { Result } from '@myapp/shared/types';
import { errorMessage } from './errors';
import { showErrorToast } from '../toasts';

/** How an action went, for buttons and menus: its value, or that it failed (already shown in a toast). */
export type ActionOutcome<T> = { ok: true; value: T } | { ok: false };

/**
 * Runs an action that has no form to show an error in: a failed Result or
 * an exception becomes a toast.
 */
export async function runOrToast<T>(action: () => Promise<Result<T>>): Promise<ActionOutcome<T>> {
  try {
    const result = await action();
    if (!result.ok) {
      void showErrorToast(result.error.message ?? 'Something went wrong');
      return { ok: false };
    }
    return { ok: true, value: result.value };
  } catch (error) {
    void showErrorToast(errorMessage(error));
    return { ok: false };
  }
}
