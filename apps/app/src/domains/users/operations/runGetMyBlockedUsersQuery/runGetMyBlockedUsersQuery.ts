import { getMyBlockedUsersQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** A page of the users the signed-in user has blocked, each with who they are. */
export function runGetMyBlockedUsersQuery({ cursor }: { cursor: string | null }) {
  return getMyBlockedUsersQuery({
    input: { cursor, limit: 30 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserBlockViews: ({ cursor, limit }) => withRetry(() => fromApi(api.users.getMyBlockedUsers.query({ cursor, limit }))),
    },
  });
}
