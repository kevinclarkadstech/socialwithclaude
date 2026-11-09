import { profileImageAspectRatios, profileImageWidths, type ProfileImageKind } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { newId } from '../../../lib/ids';
import { renderCroppedImages, type CropArea } from '../../media/utils/renderCroppedImages';
import { callingUserStore } from '../callingUserStore';
import { runConfirmProfileImageUploadMutation } from '../operations/runConfirmProfileImageUploadMutation';
import { runCreateProfileImageUploadMutation } from '../operations/runCreateProfileImageUploadMutation';

/** Uploads one file to a presigned URL, with the Content-Type it was signed for. */
async function upload({ url, blob, contentType }: { url: string; blob: Blob; contentType: string }) {
  const response = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } });
  if (!response.ok) {
    throw new Error(`The upload failed (${response.status}). Try again.`);
  }
}

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
        return upload({ url: target.url, blob: image.blob, contentType: target.contentType });
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
