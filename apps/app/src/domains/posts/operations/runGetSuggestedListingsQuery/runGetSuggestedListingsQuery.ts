import { getSuggestedListingsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** A few listings to suggest beside Marketplace (see getSuggestedListingsQuery). */
export function runGetSuggestedListingsQuery() {
  return getSuggestedListingsQuery({
    input: { limit: 6 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getSuggestedListingViews: ({ limit }) => fromApi(api.postListings.getSuggested.query({ limit })),
    },
  });
}
