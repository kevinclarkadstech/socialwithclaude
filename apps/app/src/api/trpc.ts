import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../api/src/transport/trpc';
import { config } from '../config';
import { authorizationHeader } from './sessionToken';

/**
 * Typed client for the API's tRPC routers. Only the hooks in src/hooks use
 * it, through the shared queries and mutations. Browsers send the session
 * cookie; the native app sends its token.
 */
export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${config.apiUrl}/api/trpc`,
      headers: authorizationHeader,
      fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
    }),
  ],
});
