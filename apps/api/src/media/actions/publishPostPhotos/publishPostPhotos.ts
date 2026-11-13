import { photoKey, photoKeys } from "@myapp/shared/media";
import { postPhotoSizes } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import type { Storage } from "../../../storage";
import { publishPhotoFiles } from "../../publishing/publishPhotoFiles/publishPhotoFiles";
import { readUploadedPhoto } from "../../publishing/readUploadedPhoto/readUploadedPhoto";
import { findPostPhotoProblem } from "../../checks/findPostPhotoProblem/findPostPhotoProblem";

/**
 * Publishes the photos the app uploaded for a post, as it's saved. Each needs
 * every post size, its longer side exactly that size, all one shape and not
 * longer and thinner than maxPhotoAspectRatio. One that isn't is left out (the
 * app warns about it); the rest are published at the same keys. The uploads
 * are deleted either way. Returns the published photos with their real sizes.
 */
export async function publishPostPhotos({ storage, logger, userId, postId, media }: {
    storage: Pick<Storage, "readUpload" | "putMedia" | "deleteUploads">;
    logger: AppLogger;
    userId: string;
    postId: string;
    media: { id: string }[];
}): Promise<{ id: string; width: number; height: number }[]> {
    const published: { id: string; width: number; height: number }[] = [];
    for (const { id } of media) {
        const uploadKeys = postPhotoSizes.map((size) => photoKey({ userId, parentId: postId, photoId: id, size }));
        const read = await readUploadedPhoto({ storage, uploadKeys });
        const problem = read.ok ? findPostPhotoProblem(read.files) : `${read.reason}: ${read.uploadKey}`;
        if (!read.ok || problem) {
            logger.warn("Photo left out", { userId, postId, photoId: id, reason: problem });
            continue;
        }
        await publishPhotoFiles({ storage, files: read.files.map((file) => ({ ...file, mediaKey: file.uploadKey })) });
        const largest = read.files[read.files.length - 1]!.info;
        published.push({ id, width: largest.width, height: largest.height });
    }
    await storage.deleteUploads({ keys: media.flatMap(({ id }) => photoKeys({ userId, parentId: postId, photoId: id, sizes: postPhotoSizes })) });
    return published;
}
