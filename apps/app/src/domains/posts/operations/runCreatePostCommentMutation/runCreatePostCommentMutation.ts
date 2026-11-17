import { createPostCommentMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import type { PreparedPostPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';
import { commentFromStore, postFromStoreOrApi } from '../postsFromApi/postsFromApi';

/**
 * Comments on a post, with its photo if one was picked (already uploaded).
 * `id` comes from newId(), so a retry returns the first comment.
 */
export function runCreatePostCommentMutation({ id, postId, content, photo }: { id: string; postId: string; content: string; photo: PreparedPostPhoto | null }) {
  const photoInput = photo ? { id: photo.mediaId, placeholder: photo.placeholder } : null;
  return createPostCommentMutation({
    input: { id, postId, content, photo: photoInput },
    context: { logger },
    dependencies: {
      // The API sends notifications, publishes the photo and tidies its uploads as it saves; nothing to do here for those.
      sendNotifications: async () => {},
      notifyMentions: async () => {},
      publishPostCommentPhoto: async ({ photoId }) => (photo ? { id: photoId, width: photo.width, height: photo.height } : null),
      deletePostCommentPhotoUploads: async () => {},
      getCallingUser,
      // The post (from the store, else the API) has what deciding who can see it takes.
      getPostAccessById: postFromStoreOrApi,
      getPostCommentViewById: commentFromStore,
      createPostComment: () => fromApi(api.postComments.createPostComment.mutate({ id, postId, content, photo: photoInput })),
    },
  });
}
