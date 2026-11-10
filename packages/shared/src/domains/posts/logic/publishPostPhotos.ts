import { publishUploadedPhotos } from "../../../common/photos/logic";
import type { AppLogger } from "../../../observability";
import { maxPhotoAspectRatio, postPhotoSizes } from "../constants";

/**
 * Publishes the photos the app uploaded for a post as it's saved (on the
 * server): the shared checks, at the sizes post photos are stored at. Those
 * that can't be used are left out. Returns the published ones with their
 * real dimensions.
 */
export function publishPostPhotos({ userId, postId, media, logger, storage }: {
    userId: string;
    postId: string;
    media: { id: string }[];
    logger: AppLogger;
    storage: Parameters<typeof publishUploadedPhotos>[0]["storage"];
}) {
    return publishUploadedPhotos({ userId, parentId: postId, photos: media, sizes: postPhotoSizes, maxAspectRatio: maxPhotoAspectRatio, logger, storage });
}
