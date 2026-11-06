import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { apiErrorCode, errorMessage } from './errors';
import { showErrorToast } from './errorToasts';
import { AppErrorThrown } from './runOperation';

declare module '@tanstack/react-query' {
  interface Register {
    // A query or mutation that shows its own failures (e.g. "Username is taken") sets meta.handlesErrors.
    queryMeta: { handlesErrors?: boolean };
    mutationMeta: { handlesErrors?: boolean };
  }
}

/** Failures that won't change by trying again: the request itself was refused. */
function isRefused(error: unknown) {
  if (error instanceof AppErrorThrown) {
    return true;
  }
  const code = apiErrorCode(error);
  return code !== undefined && code !== 'INTERNAL_SERVER_ERROR';
}

/**
 * The app's cache of data from the API. Anything that fails without
 * handling its own error shows a toast: the UI should prevent these, so
 * they're a catch-all.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (!query.meta?.handlesErrors) {
        showErrorToast(errorMessage(error));
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.meta?.handlesErrors) {
        showErrorToast(errorMessage(error));
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isRefused(error) && failureCount < 2,
    },
  },
});
