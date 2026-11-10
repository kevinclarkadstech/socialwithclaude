import { getFeedQuery } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { withRetry } from '../../../lib/api/withRetry';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';

/** A page of the Feed. */
export function runGetFeedQuery({ cursor }: { cursor: string | null }) {
  return getFeedQuery({
    input: { cursor, limit: 20 },
    context: { logger },
    dependencies: {
      getCallingUser,
      // The API works out what the viewer sees, so viewerId isn't sent.
      getPostViews: ({ cursor, limit }) => withRetry(() => fromApi(api.posts.getFeed.query({ cursor, limit }))),
    },
  });
}
