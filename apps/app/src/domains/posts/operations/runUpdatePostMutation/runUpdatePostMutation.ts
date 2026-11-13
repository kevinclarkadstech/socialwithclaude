import { updatePostMutation, type UpdatePostMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users/callingUserStore';
import { mediaFromStoreOrApi, postFromStoreOrApi } from '../postsFromApi/postsFromApi';

/** Changes a post's text and photos (and a listing's details). Only its author can (checked here, then by the API). */
export function runUpdatePostMutation(post: UpdatePostMutationInput) {
  return updatePostMutation({
    input: post,
    context: { logger },
    dependencies: {
      getCallingUser,
      getPostById: postFromStoreOrApi,
      getPostMediaByPostId: mediaFromStoreOrApi,
      // The API publishes the uploaded photos for real; here they're taken as they are.
      publishPostPhotos: async ({ media }) => media.map(({ id, width, height }) => ({ id, width, height })),
      // The API deletes the files of photos taken off the post.
      deleteMedia: async () => {},
      // The API takes the caller from the session, so userId isn't sent.
      updatePost: ({ userId, ...input }) => fromApi(api.posts.updatePost.mutate(input)),
    },
  });
}
