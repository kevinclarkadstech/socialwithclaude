import { postPhotoSizes } from "../constants";

/**
 * Where one size of a post photo is: the same key in the (private) uploads
 * bucket, where the app uploads it, and the media bucket, where it's
 * published once the post is saved. Under the post creator's id and the
 * post's, so uploads can't reach anyone else's.
 */
export const postPhotoKey = ({ userId, postId, mediaId, size }: { userId: string; postId: string; mediaId: string; size: number }) =>
    `${userId}/${postId}/${mediaId}-${size}`;

/** The keys of every size of a post photo. */
export const postPhotoKeys = ({ userId, postId, mediaId }: { userId: string; postId: string; mediaId: string }) =>
    postPhotoSizes.map((size) => postPhotoKey({ userId, postId, mediaId, size }));
