import { updatePostListingMutation, type UpdatePostListingMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { postFromStoreOrApi } from './postsFromApi';

/** Replaces a listing's text, price, condition and status. Only its author can. */
export function runUpdatePostListingMutation(listing: UpdatePostListingMutationInput) {
  return updatePostListingMutation({
    input: listing,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostById: postFromStoreOrApi,
      // The API takes the caller from the session, so userId isn't sent.
      updatePostListing: ({ userId, ...input }) => fromApi(api.postListings.updateListing.mutate(input)),
    },
  });
}
