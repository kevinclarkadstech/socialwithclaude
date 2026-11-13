import { deletePostMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { mediaFromStoreOrApi, postFromStoreOrApi } from '../postsFromApi/postsFromApi';

/** Deletes a post. Only its author can. */
export function runDeletePostMutation({ id }: { id: string }) {
  return deletePostMutation({
    input: { id },
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostById: postFromStoreOrApi,
      getPostMediaByPostId: mediaFromStoreOrApi,
      deletePost: async ({ id }) => {
        await fromApi(api.posts.deletePost.mutate({ id }));
        return true;
      },
      // The API deletes the post's photo files.
      deleteMedia: async () => {},
    },
  });
}
