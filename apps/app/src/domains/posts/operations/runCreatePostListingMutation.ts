import { createPostListingMutation, type CreatePostListingMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { postFromStoreOrApi } from './postsFromApi';
import { postMediaFromApp } from './postMediaFromApp';

/** Creates a listing. `id` comes from newId(), so a retry returns the first listing rather than a second. */
export function runCreatePostListingMutation(listing: CreatePostListingMutationInput) {
  return createPostListingMutation({
    input: listing,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostById: postFromStoreOrApi,
      getPostMediaByIds: postMediaFromApp,
      // The API takes the caller from the session, so userId isn't sent; photos go as chosen, in order.
      createPostListing: ({ userId, media, ...input }) =>
        fromApi(api.postListings.createListing.mutate({ ...input, media: media.map(({ id, caption }) => ({ id, caption })) })),
    },
  });
}
