import { voteOnPostCommentMutation, type VoteOnPostCommentMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { commentFromStore } from './postsFromApi';

/** Votes a comment up (1) or down (-1), replacing an earlier vote. */
export function runVoteOnPostCommentMutation(vote: VoteOnPostCommentMutationInput) {
  return voteOnPostCommentMutation({
    input: vote,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostCommentById: commentFromStore,
      setPostCommentVote: ({ postCommentId, value }) =>
        fromApi(api.postComments.voteOnPostComment.mutate({ postCommentId, value })),
    },
  });
}
