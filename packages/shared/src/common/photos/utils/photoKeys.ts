/**
 * Where one size of a photo is: the same key in the (private) uploads
 * bucket, where the app uploads it, and the media bucket, where it's
 * published. Under the uploader's id and what it belongs to (a post, later a
 * comment or chat), so uploads can't reach anyone else's.
 */
export const photoKey = ({ userId, parentId, photoId, size }: { userId: string; parentId: string; photoId: string; size: number }) =>
    `${userId}/${parentId}/${photoId}-${size}`;

/** The keys of every size of a photo. */
export const photoKeys = ({ userId, parentId, photoId, sizes }: { userId: string; parentId: string; photoId: string; sizes: readonly number[] }) =>
    sizes.map((size) => photoKey({ userId, parentId, photoId, size }));
