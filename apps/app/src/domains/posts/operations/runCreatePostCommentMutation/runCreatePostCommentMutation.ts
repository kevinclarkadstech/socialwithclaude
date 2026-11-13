import { createPostCommentMutation, type CreatePostCommentMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { commentFromStore, postFromStoreOrApi } from '../postsFromApi/postsFromApi';

/** Comments on a post. `id` comes from newId(), so a retry returns the first comment. */
export function runCreatePostCommentMutation(comment: CreatePostCommentMutationInput) {
  return createPostCommentMutation({
    input: comment,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostViewById: postFromStoreOrApi,
      getPostCommentViewById: commentFromStore,
      createPostComment: ({ id, postId, content }) =>
        fromApi(api.postComments.createPostComment.mutate({ id, postId, content })),
    },
  });
}
