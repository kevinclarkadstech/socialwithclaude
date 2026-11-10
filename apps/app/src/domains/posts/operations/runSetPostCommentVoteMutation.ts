import { setPostCommentVoteMutation, type SetPostCommentVoteMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { commentFromStore } from './postsFromApi';

/** Makes the caller's vote on a comment up (1), down (-1) or none (null). */
export function runSetPostCommentVoteMutation(vote: SetPostCommentVoteMutationInput) {
  return setPostCommentVoteMutation({
    input: vote,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostCommentViewById: commentFromStore,
      setPostCommentVote: ({ postCommentId, value }) =>
        fromApi(api.postComments.setPostCommentVote.mutate({ postCommentId, value })),
      deletePostCommentVote: async ({ postCommentId }) => {
        await fromApi(api.postComments.setPostCommentVote.mutate({ postCommentId, value: null }));
        return true;
      },
    },
  });
}
