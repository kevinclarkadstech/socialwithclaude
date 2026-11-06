import { updatePostMutation, type UpdatePostMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { postFromStoreOrApi } from './postsFromApi';

/** Changes a post's content. Only its author can (checked here, then by the API). */
export function runUpdatePostMutation(post: UpdatePostMutationInput) {
  return updatePostMutation({
    input: post,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostById: postFromStoreOrApi,
      updatePost: ({ id, content }) => fromApi(api.posts.updatePost.mutate({ id, content })),
    },
  });
}
