import type { CallingUser } from '@myapp/shared/domains';
import { orThrow } from '../../lib/api/results';
import { errorMessage } from '../../lib/api/errors';
import { logger } from '../../lib/logger';
import { showErrorToast } from '../../lib/toasts';
import { runGetMeQuery } from './operations/runGetMeQuery/runGetMeQuery';

export interface CallingUserState {
  /** False until the first load finishes. */
  isLoaded: boolean;
  /** Null when signed out. `profile` is null until sign-up is finished. */
  callingUser: CallingUser | null;
}

let state: CallingUserState = { isLoaded: false, callingUser: null };
let loading: Promise<CallingUser | null> | null = null;
const listeners = new Set<() => void>();

function setState(next: CallingUserState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Who's signed in. Loaded once at startup, set by sign-in, sign-up and
 * sign-out, and refreshed when the app comes back to the foreground (to
 * pick up changes made on other devices).
 */
export const callingUserStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set(callingUser: CallingUser | null) {
    setState({ isLoaded: true, callingUser });
  },
};

/** Loads who's signed in from the API. Concurrent calls share one request. */
export function refreshCallingUser(): Promise<CallingUser | null> {
  loading ??= runGetMeQuery()
    .then((result) => {
      const callingUser = orThrow(result);
      callingUserStore.set(callingUser);
      return callingUser;
    })
    .catch((error: unknown) => {
      logger.warn("Couldn't load the signed-in user", { error: errorMessage(error) });
      if (!state.isLoaded) {
        void showErrorToast(errorMessage(error));
      }
      // Keep whoever was signed in; the next refresh tries again.
      setState({ isLoaded: true, callingUser: state.callingUser });
      return state.callingUser;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/**
 * The getCallingUser dependency for shared queries and mutations on the
 * client: from the store, waiting for the first load if it hasn't finished.
 */
export async function getCallingUser(): Promise<CallingUser | null> {
  return state.isLoaded ? state.callingUser : refreshCallingUser();
}
