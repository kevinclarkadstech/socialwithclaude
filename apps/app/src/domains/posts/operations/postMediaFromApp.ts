import type { Media } from '@myapp/shared/common/images';
import type { Post, UploadedPostMedia } from '@myapp/shared/domains';

/** Photos this app uploaded and the API confirmed, for posts being sent, by id. */
const confirmed = new Map<string, UploadedPostMedia>();

/** Remembers photos the signed-in user just uploaded (on no post yet), so a retry doesn't upload them again. */
export function rememberConfirmedMedia({ media, userId }: { media: Media[]; userId: string }) {
  for (const item of media) {
    confirmed.set(item.id, { ...item, postId: null, createdBy: userId });
  }
}

/** Whether a photo has already been uploaded and confirmed. */
export function isMediaConfirmed(id: string): boolean {
  return confirmed.has(id);
}

/**
 * For mutations' getPostMediaByIds dependency: photos uploaded here, or
 * already on `post` (when editing it). The API looks them up again for itself.
 */
export async function postMediaFromApp({ ids, post }: { ids: string[]; post?: Post }): Promise<UploadedPostMedia[]> {
  const found: UploadedPostMedia[] = [];
  for (const id of ids) {
    const onPost = post?.media.find((media) => media.id === id);
    const media = onPost
      ? { id, path: onPost.path, width: onPost.width, height: onPost.height, placeholder: onPost.placeholder, postId: post!.id, createdBy: post!.createdBy }
      : confirmed.get(id);
    if (media) {
      found.push(media);
    }
  }
  return found;
}
