import { succeed } from '@myapp/shared/utils';
import { mapWithConcurrency } from '../../../utils';
import { uploadToStorage } from '../../../lib/photos/uploadToStorage';
import { runCreatePostMediaUploadsMutation } from '../operations/runCreatePostMediaUploadsMutation';
import type { PreparedPostPhoto } from '../utils/preparePostPhoto';

/** How many files upload at once: enough to be quick, few enough for a slow phone connection. */
const parallelUploads = 4;

/**
 * Uploads photos as they're picked for a post being written or edited: one
 * call for every upload URL, then the files straight to storage, a few at a
 * time. Saving the post publishes them. Returns which photos uploaded fully
 * (every size); the API's failure, if it refused them all.
 */
export async function uploadPostPhotos({ postId, photos }: { postId: string; photos: PreparedPostPhoto[] }) {
  const created = await runCreatePostMediaUploadsMutation({
    postId,
    media: photos.map((photo) => ({
      mediaId: photo.mediaId,
      files: photo.files.map((file) => ({ size: file.size, contentType: file.contentType, contentLength: file.blob.size })),
    })),
  });
  if (!created.ok) {
    return created;
  }
  const uploads = created.value.uploads;
  const results = await mapWithConcurrency(uploads, parallelUploads, (target) => {
    const photo = photos.find((candidate) => candidate.mediaId === target.mediaId)!;
    const file = photo.files.find((candidate) => candidate.size === target.size)!;
    return uploadToStorage({ url: target.url, blob: file.blob, contentType: target.contentType });
  });
  const failedIds = new Set(uploads.filter((_, index) => results[index]!.status === 'rejected').map((target) => target.mediaId));
  return succeed({ uploadedIds: photos.map((photo) => photo.mediaId).filter((id) => !failedIds.has(id)) });
}
