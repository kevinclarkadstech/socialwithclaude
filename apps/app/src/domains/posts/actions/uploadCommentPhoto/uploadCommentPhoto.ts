import { succeed } from '@myapp/shared/utils';
import { uploadToStorage } from '../../../../lib/photos/uploadToStorage';
import { runCreatePostCommentPhotoUploadMutation } from '../../operations/runCreatePostCommentPhotoUploadMutation/runCreatePostCommentPhotoUploadMutation';
import type { PreparedPostPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';

/**
 * Uploads a photo picked for a comment (every size), as soon as it's picked:
 * saving the comment publishes it. Throws if a file doesn't upload.
 */
export async function uploadCommentPhoto({ postId, postCommentId, photo }: { postId: string; postCommentId: string; photo: PreparedPostPhoto }) {
  const created = await runCreatePostCommentPhotoUploadMutation({
    postId,
    postCommentId,
    photoId: photo.mediaId,
    files: photo.files.map((file) => ({ size: file.size, contentType: file.contentType, contentLength: file.blob.size })),
  });
  if (!created.ok) {
    return created;
  }
  await Promise.all(created.value.uploads.map((target) => {
    const file = photo.files.find((candidate) => candidate.size === target.size)!;
    return uploadToStorage({ url: target.url, blob: file.blob, contentType: target.contentType });
  }));
  return succeed();
}
