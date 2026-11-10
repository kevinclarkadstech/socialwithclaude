import { profilePhotoAspectRatios, profilePhotoWidths, type ProfilePhotoKind } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { newId } from '../../../lib/ids';
import { renderCroppedPhotos, type CropArea } from '../../../lib/photos/renderCroppedPhotos';
import { uploadToStorage } from '../../../lib/photos/uploadToStorage';
import { callingUserStore } from '../callingUserStore';
import { runConfirmProfilePhotoUploadMutation } from '../operations/runConfirmProfilePhotoUploadMutation';
import { runCreateProfilePhotoUploadMutation } from '../operations/runCreateProfilePhotoUploadMutation';

/**
 * Sets the signed-in user's avatar or cover from a photo: crops and resizes it
 * here to every stored width, uploads them straight to storage, then has the
 * API check and publish them. Returns their updated profile (a new updatedAt,
 * which changes the photo URLs). A failure has been shown in a toast.
 */
export async function changeProfilePhoto({ kind, photo, crop }: { kind: ProfilePhotoKind; photo: Blob; crop: CropArea }) {
  const result = await runOrToast(async () => {
    const photos = await renderCroppedPhotos({
      source: photo,
      crop,
      widths: profilePhotoWidths[kind],
      aspectRatio: profilePhotoAspectRatios[kind],
    });
    const uploadId = newId();
    const created = await runCreateProfilePhotoUploadMutation({
      kind,
      uploadId,
      files: photos.map((photo) => ({ width: photo.width, contentType: photo.contentType, contentLength: photo.blob.size })),
    });
    if (!created.ok) {
      return created;
    }
    await Promise.all(
      created.value.uploads.map((target) => {
        const photo = photos.find((candidate) => candidate.width === target.width)!;
        return uploadToStorage({ url: target.url, blob: photo.blob, contentType: target.contentType });
      }),
    );
    return runConfirmProfilePhotoUploadMutation({ kind, uploadId });
  });
  if (result.ok) {
    const { callingUser } = callingUserStore.get();
    if (callingUser) {
      callingUserStore.set({ ...callingUser, profile: result.value });
    }
  }
  return result;
}
