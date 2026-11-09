import { updatePostMutation, type UpdatePostMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../../users/callingUserStore';
import { postFromStoreOrApi } from './postsFromApi';
import { postMediaFromApp } from './postMediaFromApp';
import { postStore } from '../postStore';

/** Changes a post's text and photos. Only its author can (checked here, then by the API). */
export function runUpdatePostMutation(post: UpdatePostMutationInput) {
  return updatePostMutation({
    input: post,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostById: postFromStoreOrApi,
      getPostMediaByIds: ({ ids }) => postMediaFromApp({ ids, post: postStore.getItem(post.id) }),
      // The API deletes the files of photos taken off the post.
      deleteMedia: async () => {},
      updatePost: ({ id, content, media }) =>
        fromApi(api.posts.updatePost.mutate({ id, content, media: media.map(({ id, caption }) => ({ id, caption })) })),
    },
  });
}
