import { savePostMutation, type PostView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Saves `post` (the one on screen, which says who can see it). */
export function runSavePostMutation({ post }: { post: PostView }) {
  return savePostMutation({
    input: { postId: post.id },
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostViewById: async () => post,
      savePost: async ({ postId }) => {
        await fromApi(api.posts.save.mutate({ postId }));
        return true;
      },
    },
  });
}
