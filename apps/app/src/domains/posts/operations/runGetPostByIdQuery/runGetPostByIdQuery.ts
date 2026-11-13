import { getPostByIdQuery } from '@myapp/shared/domains';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users/callingUserStore';
import { fetchPostById } from '../postsFromApi/postsFromApi';

/** One post, fresh from the API. Fails with not-found if it doesn't exist or was deleted. */
export function runGetPostByIdQuery({ postId }: { postId: string }) {
  return getPostByIdQuery({
    input: { postId },
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostViewById: ({ id }) => fetchPostById(id),
    },
  });
}
