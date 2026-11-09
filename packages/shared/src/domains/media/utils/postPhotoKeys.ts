import { postPhotoSizes } from "../constants";

/** Where an upload of one size lands in the (private) uploads bucket, under the uploader's id. */
export const postPhotoUploadKey = ({ userId, mediaId, size }: { userId: string; mediaId: string; size: number }) =>
    `${userId}/post-media/${mediaId}/${size}`;

/**
 * Where a post photo's files go in the media bucket. `token` is random and
 * made by the server, so the address can't be guessed from the photo's id
 * (photos on followers-only posts are only reachable by being shown them).
 */
export const postPhotoPath = ({ mediaId, token }: { mediaId: string; token: string }) =>
    `post-media/${mediaId}/${token}`;

/** The key of one size of a published post photo. */
export const postPhotoKey = ({ path, size }: { path: string; size: number }) => `${path}-${size}`;

/** A photo's dimensions at `size`: its longer side is `size`, its shape unchanged. */
export function postPhotoDimensions({ width, height, size }: { width: number; height: number; size: number }) {
    if (width >= height) {
        return { width: size, height: Math.max(1, Math.round((size * height) / width)) };
    }
    return { width: Math.max(1, Math.round((size * width) / height)), height: size };
}

/** The keys of every size of a published post photo. */
export const postPhotoKeys = ({ path }: { path: string }) => postPhotoSizes.map((size) => postPhotoKey({ path, size }));
