import { reportPostCommentMutation, type ReportPostCommentMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { commentFromStore, postFromStoreOrApi } from '../postsFromApi/postsFromApi';

/** Reports a comment. The API keeps a snapshot of it. */
export function runReportPostCommentMutation(report: ReportPostCommentMutationInput) {
  return reportPostCommentMutation({
    input: report,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostCommentViewById: commentFromStore,
      // The post (from the store, else the API) has what deciding who can see it takes.
      getPostAccessById: postFromStoreOrApi,
      createPostCommentReport: ({ id, postCommentId, reason, details }) =>
        fromApi(api.postComments.reportPostComment.mutate({ id, postCommentId, reason, details })),
    },
  });
}
