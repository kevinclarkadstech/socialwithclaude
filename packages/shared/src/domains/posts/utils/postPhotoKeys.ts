import { postPhotoSizes } from "../constants";

/** Where an upload of one size of a post photo lands in the (private) uploads bucket, under the uploader's id. */
export const postPhotoUploadKey = ({ userId, mediaId, size }: { userId: string; mediaId: string; size: number }) =>
    `${userId}/post-media/${mediaId}/${size}`;

/**
 * Where a photo's files go in the media bucket. `token` is random and made
 * by the server, so the address can't be guessed from the photo's id (photos
 * on followers-only posts are only reachable by being shown them).
 */
export const mediaPath = ({ mediaId, token }: { mediaId: string; token: string }) => `media/${mediaId}/${token}`;

/** The key of one size of a published photo. */
export const mediaKey = ({ path, size }: { path: string; size: number }) => `${path}-${size}`;

/** The keys of every size of a published post photo. */
export const postPhotoKeys = ({ path }: { path: string }) => postPhotoSizes.map((size) => mediaKey({ path, size }));
