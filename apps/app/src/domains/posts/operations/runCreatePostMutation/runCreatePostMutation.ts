import { createPostMutation, type CreatePostMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users/callingUserStore';
import { postFromStoreOrApi } from '../postsFromApi/postsFromApi';

/** Creates a post, or a listing when `listing` is given. `id` comes from newId(), so a retry returns the first post rather than a second. */
export function runCreatePostMutation(post: CreatePostMutationInput) {
  return createPostMutation({
    input: post,
    context: { logger },
    dependencies: {
      getCallingUser,
      // Only the server knows the feature flag; it refuses if posting is off.
      isPostingEnabled: () => true,
      getPostViewById: postFromStoreOrApi,
      // The API publishes the uploaded photos for real; here they're taken as they are.
      publishPostPhotos: async ({ media }) => media.map(({ id, width, height }) => ({ id, width, height })),
      // The API takes the caller from the session, so userId isn't sent.
      createPost: ({ userId, ...input }) => fromApi(api.posts.createPost.mutate(input)),
    },
  });
}
