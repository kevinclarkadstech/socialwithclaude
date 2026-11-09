import { profileImageAspectRatios, profileImageWidths, type ProfileImageKind } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { newId } from '../../../lib/ids';
import { renderCroppedImages, type CropArea } from '../../../lib/images/renderCroppedImages';
import { uploadToStorage } from '../../../lib/images/uploadToStorage';
import { callingUserStore } from '../callingUserStore';
import { runConfirmProfileImageUploadMutation } from '../operations/runConfirmProfileImageUploadMutation';
import { runCreateProfileImageUploadMutation } from '../operations/runCreateProfileImageUploadMutation';

/**
 * Sets the signed-in user's avatar or cover from a photo: crops and resizes it
 * here to every stored width, uploads them straight to storage, then has the
 * API check and publish them. Returns their updated profile (a new updatedAt,
 * which changes the image URLs). A failure has been shown in a toast.
 */
export async function changeProfileImage({ kind, photo, crop }: { kind: ProfileImageKind; photo: Blob; crop: CropArea }) {
  const result = await runOrToast(async () => {
    const images = await renderCroppedImages({
      source: photo,
      crop,
      widths: profileImageWidths[kind],
      aspectRatio: profileImageAspectRatios[kind],
    });
    const uploadId = newId();
    const created = await runCreateProfileImageUploadMutation({
      kind,
      uploadId,
      files: images.map((image) => ({ width: image.width, contentType: image.contentType, contentLength: image.blob.size })),
    });
    if (!created.ok) {
      return created;
    }
    await Promise.all(
      created.value.uploads.map((target) => {
        const image = images.find((candidate) => candidate.width === target.width)!;
        return uploadToStorage({ url: target.url, blob: image.blob, contentType: target.contentType });
      }),
    );
    return runConfirmProfileImageUploadMutation({ kind, uploadId });
  });
  if (result.ok) {
    const { callingUser } = callingUserStore.get();
    if (callingUser) {
      callingUserStore.set({ ...callingUser, profile: result.value });
    }
  }
  return result;
}
