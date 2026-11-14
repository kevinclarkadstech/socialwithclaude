import type { AppError } from '@myapp/shared/error-handling';

export interface DisallowedAction {
  /** Why it was disallowed: the error from the shared can* check. */
  error: AppError;
  /** What the user was trying to do, run once they've signed in (and finished sign-up). */
  action?: () => void;
}

type Listener = (disallowed: DisallowedAction) => void;

const listeners = new Set<Listener>();

/**
 * Actions a can* check refused. App listens: it opens sign-in for
 * "not-signed-in", onboarding for "profile-required", and otherwise shows
 * the error's message.
 */
export const disallowedActions = {
  emit(disallowed: DisallowedAction) {
    for (const listener of listeners) {
      listener(disallowed);
    }
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
