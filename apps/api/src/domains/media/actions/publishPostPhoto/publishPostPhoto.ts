import { photoKey } from "@myapp/shared/media";
import { postPhotoSizes } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import type { Storage } from "../../../../infra/storage";
import { publishPhotoFiles } from "../../publishing/publishPhotoFiles/publishPhotoFiles";
import { readUploadedPhoto } from "../../publishing/readUploadedPhoto/readUploadedPhoto";
import { findPostPhotoProblem } from "../../checks/findPostPhotoProblem/findPostPhotoProblem";

/**
 * Publishes one photo the app uploaded for a post: it needs every post size,
 * its longer side exactly that size, all one shape and not longer and
 * thinner than maxPhotoAspectRatio. Each size is stripped of its metadata
 * and published at the same key. Null (logged) if the photo isn't usable.
 *
 * Safe to run again: it writes the same keys, and the uploads are left in
 * place (deletePostPhotoUploads removes them once the post is saved).
 */
export async function publishPostPhoto({ storage, logger, userId, postId, photoId }: {
    storage: Pick<Storage, "readUpload" | "putMedia">;
    logger: AppLogger;
    userId: string;
    postId: string;
    photoId: string;
}): Promise<{ id: string; width: number; height: number } | null> {
    const uploadKeys = postPhotoSizes.map((size) => photoKey({ userId, parentId: postId, photoId, size }));
    const read = await readUploadedPhoto({ storage, uploadKeys });
    const problem = read.ok ? findPostPhotoProblem(read.files) : `${read.reason}: ${read.uploadKey}`;
    if (!read.ok || problem) {
        logger.warn("Photo left out", { userId, postId, photoId, reason: problem });
        return null;
    }
    await publishPhotoFiles({ storage, files: read.files.map((file) => ({ ...file, mediaKey: file.uploadKey })) });
    const largest = read.files[read.files.length - 1]!.info;
    return { id: photoId, width: largest.width, height: largest.height };
}
