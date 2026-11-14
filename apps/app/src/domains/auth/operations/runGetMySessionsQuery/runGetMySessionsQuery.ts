import { api } from '../../../../lib/api/trpc';
import { withRetry } from '../../../../lib/api/withRetry';

/**
 * Where the signed-in user is signed in, this device marked current. Server
 * only (it reads session tokens), so the app calls the API directly.
 */
export function runGetMySessionsQuery() {
  return withRetry(() => api.auth.getMySessions.query({}));
}
