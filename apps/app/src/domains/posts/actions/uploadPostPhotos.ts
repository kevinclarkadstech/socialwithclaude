import { succeed } from '@myapp/shared/utils';
import { uploadToStorage } from '../../../lib/images/uploadToStorage';
import { getCallingUser } from '../../users/callingUserStore';
import { isMediaConfirmed, rememberConfirmedMedia } from '../operations/postMediaFromApp';
import { runConfirmPostMediaUploadsMutation } from '../operations/runConfirmPostMediaUploadsMutation';
import { runCreatePostMediaUploadsMutation } from '../operations/runCreatePostMediaUploadsMutation';
import type { PreparedPostPhoto } from '../utils/preparePostPhoto';

/**
 * Uploads photos for a post being sent: one call for every upload URL, the
 * files straight to storage, then one call to have the API check and publish
 * them. Photos already uploaded (by an earlier try) are skipped. Throws if
 * storage refuses a file; returns the API's failure otherwise.
 */
export async function uploadPostPhotos({ photos }: { photos: PreparedPostPhoto[] }) {
  const toUpload = photos.filter((photo) => !isMediaConfirmed(photo.mediaId));
  if (toUpload.length === 0) {
    return succeed(null);
  }
  const created = await runCreatePostMediaUploadsMutation({
    media: toUpload.map((photo) => ({
      mediaId: photo.mediaId,
      files: photo.files.map((file) => ({ size: file.size, contentType: file.contentType, contentLength: file.blob.size })),
    })),
  });
  if (!created.ok) {
    return created;
  }
  await Promise.all(
    created.value.uploads.map((target) => {
      const photo = toUpload.find((candidate) => candidate.mediaId === target.mediaId)!;
      const file = photo.files.find((candidate) => candidate.size === target.size)!;
      return uploadToStorage({ url: target.url, blob: file.blob, contentType: target.contentType });
    }),
  );
  const confirmed = await runConfirmPostMediaUploadsMutation({
    media: toUpload.map((photo) => ({ mediaId: photo.mediaId, placeholder: photo.placeholder })),
  });
  if (!confirmed.ok) {
    return confirmed;
  }
  const caller = await getCallingUser();
  if (caller) {
    rememberConfirmedMedia({ media: confirmed.value.media, userId: caller.userId });
  }
  return succeed(null);
}
