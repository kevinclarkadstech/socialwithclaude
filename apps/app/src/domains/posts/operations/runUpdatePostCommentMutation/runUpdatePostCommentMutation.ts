import { updatePostCommentMutation, type UpdatePostCommentMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { commentFromStore } from '../postsFromApi/postsFromApi';

/** Changes a comment's content. Only its author can. */
export function runUpdatePostCommentMutation(comment: UpdatePostCommentMutationInput) {
  return updatePostCommentMutation({
    input: comment,
    context: { logger },
    dependencies: {
      // The API sends notifications when it saves; nothing to send from here.
      notifyMentions: async () => {},
      getCallingUser,
      getPostCommentViewById: commentFromStore,
      updatePostComment: ({ id, content }) => fromApi(api.postComments.updatePostComment.mutate({ id, content })),
    },
  });
}
