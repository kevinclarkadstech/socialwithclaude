import { api } from '../../../../lib/api/trpc';

/** Signs one of the user's other devices out. Server only (it needs the session's token), so the app calls the API directly. */
export function runRevokeSessionMutation({ id }: { id: string }) {
  return api.auth.revokeSession.mutate({ id });
}
