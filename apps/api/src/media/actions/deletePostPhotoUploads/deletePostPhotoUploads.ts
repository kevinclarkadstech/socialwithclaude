import { photoKeys } from "@myapp/shared/media";
import { postPhotoSizes } from "@myapp/shared/domains";
import type { Storage } from "../../../storage";

/**
 * Deletes the uploads of a post's photos (every size), once the post is
 * saved. Ones already gone are fine. Any left behind expire from the
 * uploads bucket on their own.
 */
export async function deletePostPhotoUploads({ storage, userId, postId, photoIds }: {
    storage: Pick<Storage, "deleteUploads">;
    userId: string;
    postId: string;
    photoIds: string[];
}): Promise<void> {
    if (photoIds.length === 0) {
        return;
    }
    await storage.deleteUploads({
        keys: photoIds.flatMap((photoId) => photoKeys({ userId, parentId: postId, photoId, sizes: postPhotoSizes })),
    });
}
