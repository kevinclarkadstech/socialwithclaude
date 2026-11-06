import { reportPostCommentMutation, type ReportPostCommentMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { commentFromStore } from './postsFromApi';

/** Reports a comment. The API keeps a snapshot of it. */
export function runReportPostCommentMutation(report: ReportPostCommentMutationInput) {
  return reportPostCommentMutation({
    input: report,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostCommentById: commentFromStore,
      createPostCommentReport: ({ id, postCommentId, reason, details }) =>
        fromApi(api.postComments.reportPostComment.mutate({ id, postCommentId, reason, details })),
    },
  });
}
