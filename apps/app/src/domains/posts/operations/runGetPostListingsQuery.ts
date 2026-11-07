import { getPostListingsQuery, type ListingStatus } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { withRetry } from '../../../lib/api/withRetry';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';

/** A page of listings, newest first; only those with `status` if given. */
export function runGetPostListingsQuery({ status, cursor }: { status: ListingStatus | null; cursor: string | null }) {
  return getPostListingsQuery({
    input: { status: status ?? undefined, cursor, limit: 20 },
    context: { logger },
    dependencies: {
      getCallingUser,
      // The API works out what the viewer sees, so viewerId isn't sent.
      getPostListings: ({ status, cursor, limit }) =>
        withRetry(() => fromApi(api.postListings.getListings.query({ status, cursor, limit }))),
    },
  });
}
