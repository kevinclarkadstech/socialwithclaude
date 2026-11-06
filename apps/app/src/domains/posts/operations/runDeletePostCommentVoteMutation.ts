import { deletePostCommentVoteMutation } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';

/** Removes the caller's vote on a comment. */
export function runDeletePostCommentVoteMutation({ postCommentId }: { postCommentId: string }) {
  return deletePostCommentVoteMutation({
    input: { postCommentId },
    context: { logger },
    dependencies: {
      getCallingUser,
      deletePostCommentVote: async ({ postCommentId }) => {
        await fromApi(api.postComments.deletePostCommentVote.mutate({ postCommentId }));
        return true;
      },
    },
  });
}
