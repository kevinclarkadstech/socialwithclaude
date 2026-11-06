import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../../api/src/transport/trpc';
import { config } from '../config';
import { authorizationHeader } from '../auth/sessionToken';

/**
 * Typed client for the API's tRPC routers. Only the operation runners in
 * src/domains use it. Browsers send the session cookie; the native app
 * sends its token.
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
