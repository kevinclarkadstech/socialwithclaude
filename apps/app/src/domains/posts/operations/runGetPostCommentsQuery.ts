import { getPostCommentsQuery } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { withRetry } from '../../../lib/api/withRetry';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';

/** A page of a post's comments, oldest first. */
export function runGetPostCommentsQuery({ postId, cursor }: { postId: string; cursor: string | null }) {
  return getPostCommentsQuery({
    input: { postId, cursor, limit: 30, order: 'oldest' },
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostCommentViews: ({ postId, order, cursor, limit }) =>
        withRetry(() => fromApi(api.postComments.getPostComments.query({ postId, order, cursor, limit }))),
    },
  });
}
