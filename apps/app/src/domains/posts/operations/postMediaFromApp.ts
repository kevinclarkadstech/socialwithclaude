import type { Post, PostMedia, UploadedPostMedia } from '@myapp/shared/domains';

/** Photos this app uploaded (and the API confirmed) for posts being written, by id. */
const uploaded = new Map<string, UploadedPostMedia>();

/** Remembers a photo the signed-in user just uploaded, on no post yet. */
export function rememberUploadedPostMedia({ media, userId }: { media: PostMedia; userId: string }) {
  uploaded.set(media.id, { ...media, postId: null, createdBy: userId });
}

/**
 * For mutations' getPostMediaByIds dependency: photos uploaded here, or
 * already on `post` (when editing it). The API looks them up again for itself.
 */
export async function postMediaFromApp({ ids, post }: { ids: string[]; post?: Post }): Promise<UploadedPostMedia[]> {
  const found: UploadedPostMedia[] = [];
  for (const id of ids) {
    const onPost = post?.media.find((media) => media.id === id);
    const media = onPost ? { ...onPost, postId: post!.id, createdBy: post!.createdBy } : uploaded.get(id);
    if (media) {
      found.push(media);
    }
  }
  return found;
}
