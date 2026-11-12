import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { config } from '../config';
import { isNativePlatform } from '../../utils';
import { sessionToken } from './sessionToken';

/** better-auth's client: sends and checks sign-in codes, and signs out. */
export const authClient = createAuthClient({
  baseURL: config.apiUrl,
  plugins: [emailOTPClient()],
  fetchOptions: {
    credentials: 'include',
    ...(isNativePlatform && {
      auth: { type: 'Bearer', token: () => sessionToken.get() ?? undefined },
      // After signing in, the API returns the session token in this header.
      onSuccess: async ({ response }) => {
        const token = response.headers.get('set-auth-token');
        if (token) {
          await sessionToken.set(token);
        }
      },
    }),
  },
});
