import { unsavePostMutation, type PostView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Unsaves `post`. */
export function runUnsavePostMutation({ post }: { post: PostView }) {
  return unsavePostMutation({
    input: { postId: post.id },
    context: { logger },
    dependencies: {
      getCallingUser,
      unsavePost: async ({ postId }) => {
        await fromApi(api.posts.unsave.mutate({ postId }));
        return true;
      },
    },
  });
}
