import { photoKey } from "../photoKey/photoKey";

/** The keys of every size of a photo. */
export const photoKeys = ({ userId, parentId, photoId, sizes }: { userId: string; parentId: string; photoId: string; sizes: readonly number[] }) =>
    sizes.map((size) => photoKey({ userId, parentId, photoId, size }));
