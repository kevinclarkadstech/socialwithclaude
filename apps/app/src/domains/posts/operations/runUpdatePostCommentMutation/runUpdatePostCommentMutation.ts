import { updatePostCommentMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import type { PreparedPostPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';
import { commentFromStore } from '../postsFromApi/postsFromApi';

/**
 * Changes one of your comments: its text, and its photo (left out: keep it;
 * null: remove it; a new photo, already uploaded: replace it).
 */
export function runUpdatePostCommentMutation({ id, content, photo }: { id: string; content: string; photo?: PreparedPostPhoto | null }) {
  const photoInput = photo === undefined ? undefined : photo === null ? null : { id: photo.mediaId, placeholder: photo.placeholder };
  return updatePostCommentMutation({
    input: { id, content, photo: photoInput },
    context: { logger },
    dependencies: {
      // The API sends notifications, publishes the photo and deletes old files as it saves; nothing to do here for those.
      notifyMentions: async () => {},
      publishPostCommentPhoto: async ({ photoId }) => (photo ? { id: photoId, width: photo.width, height: photo.height } : null),
      deletePostCommentPhotoUploads: async () => {},
      deleteMedia: async () => {},
      getCallingUser,
      getPostCommentViewById: commentFromStore,
      updatePostComment: () => fromApi(api.postComments.updatePostComment.mutate({ id, content, photo: photoInput })),
    },
  });
}
