import { createPostMutation, type CreatePostMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { postFromStoreOrApi } from './postsFromApi';

/** Creates a post. `id` comes from newId(), so a retry returns the first post rather than a second. */
export function runCreatePostMutation(post: CreatePostMutationInput) {
  return createPostMutation({
    input: post,
    context: { logger },
    dependencies: {
      getCallingUser,
      // Only the server knows the feature flag; it refuses if posting is off.
      isPostingEnabled: () => true,
      getPostById: postFromStoreOrApi,
      createPost: ({ id, content }) => fromApi(api.posts.createPost.mutate({ id, content })),
    },
  });
}
