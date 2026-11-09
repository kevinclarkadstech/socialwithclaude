import { publishPostPhotos } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import { deleteUploads, putMedia, readUpload } from "./index";

/** The publishPostPhotos dependency for a request: the shared checks, run against this storage. */
export function publishPostPhotosWith(logger: AppLogger) {
    return (args: { userId: string; postId: string; media: { id: string }[] }) =>
        publishPostPhotos({ ...args, logger, storage: { readUpload, putMedia, deleteUploads } });
}
