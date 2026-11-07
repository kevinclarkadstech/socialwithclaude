import { deletePostCommentMutation } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { commentFromStore } from './postsFromApi';

/** Deletes a comment. Only its author can. */
export function runDeletePostCommentMutation({ id }: { id: string }) {
  return deletePostCommentMutation({
    input: { id },
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostCommentById: commentFromStore,
      deletePostComment: async ({ id }) => {
        await fromApi(api.postComments.deletePostComment.mutate({ id }));
        return true;
      },
    },
  });
}
