import { updatePostListingMutation, type UpdatePostListingMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { postFromStoreOrApi } from './postsFromApi';
import { postMediaFromApp } from './postMediaFromApp';
import { postStore } from '../postStore';

/** Replaces a listing's text, photos, price, condition and status. Only its author can. */
export function runUpdatePostListingMutation(listing: UpdatePostListingMutationInput) {
  return updatePostListingMutation({
    input: listing,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostById: postFromStoreOrApi,
      getPostMediaByIds: ({ ids }) => postMediaFromApp({ ids, post: postStore.getItem(listing.id) }),
      // The API deletes the files of photos taken off the listing.
      deleteMedia: async () => {},
      // The API takes the caller from the session, so userId isn't sent; photos go as chosen, in order.
      updatePostListing: ({ userId, removedMediaIds, media, ...input }) =>
        fromApi(api.postListings.updateListing.mutate({ ...input, media: media.map(({ id, caption }) => ({ id, caption })) })),
    },
  });
}
