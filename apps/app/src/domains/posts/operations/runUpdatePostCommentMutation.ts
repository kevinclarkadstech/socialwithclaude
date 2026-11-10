import { updatePostCommentMutation, type UpdatePostCommentMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { commentFromStore } from './postsFromApi';

/** Changes a comment's content. Only its author can. */
export function runUpdatePostCommentMutation(comment: UpdatePostCommentMutationInput) {
  return updatePostCommentMutation({
    input: comment,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostCommentViewById: commentFromStore,
      updatePostComment: ({ id, content }) => fromApi(api.postComments.updatePostComment.mutate({ id, content })),
    },
  });
}
