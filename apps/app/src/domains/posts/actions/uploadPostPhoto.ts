import { postPhotoSizes, type PostMedia } from '@myapp/shared/domains';
import { succeed } from '@myapp/shared/utils';
import { runOrToast } from '../../../lib/api/runOrToast';
import { newId } from '../../../lib/ids';
import { renderPhotoSizes } from '../../media/utils/renderPhotoSizes';
import { uploadToStorage } from '../../media/utils/uploadToStorage';
import { getCallingUser } from '../../users/callingUserStore';
import { rememberUploadedPostMedia } from '../operations/postMediaFromApp';
import { runConfirmPostMediaUploadMutation } from '../operations/runConfirmPostMediaUploadMutation';
import { runCreatePostMediaUploadMutation } from '../operations/runCreatePostMediaUploadMutation';

/**
 * Uploads a photo for a post being written: resizes it here to every stored
 * size, uploads them straight to storage, then has the API check and publish
 * them. The photo is then ready to add to a post by its id. A failure has
 * been shown in a toast.
 */
export async function uploadPostPhoto({ photo }: { photo: Blob }) {
  return runOrToast(async () => {
    const { photos, placeholder } = await renderPhotoSizes({ source: photo, sizes: postPhotoSizes });
    const mediaId = newId();
    const created = await runCreatePostMediaUploadMutation({
      mediaId,
      files: photos.map((file) => ({ size: file.size, contentType: file.contentType, contentLength: file.blob.size })),
    });
    if (!created.ok) {
      return created;
    }
    await Promise.all(
      created.value.uploads.map((target) => {
        const file = photos.find((candidate) => candidate.size === target.size)!;
        return uploadToStorage({ url: target.url, blob: file.blob, contentType: target.contentType });
      }),
    );
    const confirmed = await runConfirmPostMediaUploadMutation({ mediaId, placeholder });
    if (!confirmed.ok) {
      return confirmed;
    }
    const caller = await getCallingUser();
    if (caller) {
      rememberUploadedPostMedia({ media: confirmed.value, userId: caller.userId });
    }
    const media: PostMedia = confirmed.value;
    return succeed(media);
  });
}
