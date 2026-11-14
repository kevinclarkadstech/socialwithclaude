import { getMyFollowRequestsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** A page of pending requests to follow the signed-in user, each with who's asking. */
export function runGetMyFollowRequestsQuery({ cursor }: { cursor: string | null }) {
  return getMyFollowRequestsQuery({
    input: { cursor, limit: 30 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserFollowRequestViews: ({ cursor, limit }) =>
        withRetry(() => fromApi(api.users.getMyFollowRequests.query({ cursor, limit }))),
    },
  });
}
