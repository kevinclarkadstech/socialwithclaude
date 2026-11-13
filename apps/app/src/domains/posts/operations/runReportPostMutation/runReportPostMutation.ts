import { reportPostMutation, type ReportPostMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { postFromStoreOrApi } from '../postsFromApi/postsFromApi';

/** Reports a post. The API keeps a snapshot of it. */
export function runReportPostMutation(report: ReportPostMutationInput) {
  return reportPostMutation({
    input: report,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostViewById: postFromStoreOrApi,
      createPostReport: ({ id, postId, reason, details }) =>
        fromApi(api.posts.reportPost.mutate({ id, postId, reason, details })),
    },
  });
}
