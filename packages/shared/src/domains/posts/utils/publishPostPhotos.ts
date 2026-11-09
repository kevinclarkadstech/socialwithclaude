import { imageContentTypes, maxImageUploadBytes } from "../../../common/images/constants";
import { inspectImage, longSideDimensions, stripImageMetadata, type ImageInfo } from "../../../common/images/utils";
import type { AppLogger } from "../../../observability";
import { validationError } from "../../../error-handling";
import type { Result } from "../../../types/result";
import { fail, succeed } from "../../../utils/result";
import { maxPhotoAspectRatio, postPhotoSizes } from "../constants";
import { postPhotoKey, postPhotoKeys } from "./postPhotoKeys";

type CheckedFile = { size: number; bytes: Uint8Array; info: ImageInfo };

/**
 * Publishes photos the app uploaded for a post, on the server, as the post
 * is saved: for each, every size must be there and be a JPEG or WebP whose
 * longer side is that size, all in one shape (no thinner than 3:1), within
 * the size limit. Each that passes is stripped of metadata (EXIF location and
 * the like) and copied to the media bucket at the same key. One that doesn't
 * is left out (the caller warns about it). The uploads are deleted either way.
 * Returns the published photos with their real dimensions.
 */
export async function publishPostPhotos({ userId, postId, media, logger, storage }: {
    userId: string;
    postId: string;
    media: { id: string }[];
    logger: AppLogger;
    storage: {
        readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
        putMedia: (args: { key: string; bytes: Uint8Array; contentType: string }) => Promise<void>;
        deleteUploads: (args: { keys: string[] }) => Promise<void>;
    };
}): Promise<{ id: string; width: number; height: number }[]> {
    const published: { id: string; width: number; height: number }[] = [];
    for (const { id } of media) {
        const files = await readAndCheck({ userId, postId, mediaId: id, readUpload: storage.readUpload });
        if (!files.ok) {
            logger.warn("Post photo left out", { userId, postId, mediaId: id, reason: files.error.message });
            continue;
        }
        await Promise.all(files.value.map((file) => storage.putMedia({
            key: postPhotoKey({ userId, postId, mediaId: id, size: file.size }),
            bytes: stripImageMetadata(file.bytes, file.info.format),
            contentType: imageContentTypes[file.info.format],
        })));
        const largest = files.value[files.value.length - 1]!.info;
        published.push({ id, width: largest.width, height: largest.height });
    }
    await storage.deleteUploads({ keys: media.flatMap(({ id }) => postPhotoKeys({ userId, postId, mediaId: id })) });
    return published;
}

/** Every size of one photo's upload, checked; or why it can't be used. */
async function readAndCheck({ userId, postId, mediaId, readUpload }: {
    userId: string;
    postId: string;
    mediaId: string;
    readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
}): Promise<Result<CheckedFile[]>> {
    const files: CheckedFile[] = [];
    for (const size of postPhotoSizes) {
        const bytes = await readUpload({ key: postPhotoKey({ userId, postId, mediaId, size }) });
        if (!bytes) {
            return fail(validationError(`size ${size} missing`));
        }
        const info = inspectImage(bytes);
        if (!info || bytes.length > maxImageUploadBytes || Math.max(info.width, info.height) !== size) {
            return fail(validationError(`size ${size} unusable`));
        }
        files.push({ size, bytes, info });
    }
    // The largest size sets the shape; the others must match it (rounding on the device can be a pixel off).
    const largest = files[files.length - 1]!.info;
    if (Math.max(largest.width, largest.height) / Math.min(largest.width, largest.height) > maxPhotoAspectRatio) {
        return fail(validationError("too long and thin"));
    }
    for (const file of files) {
        const expected = longSideDimensions({ width: largest.width, height: largest.height, size: file.size });
        if (Math.abs(file.info.width - expected.width) > 1 || Math.abs(file.info.height - expected.height) > 1) {
            return fail(validationError(`size ${file.size} a different shape`));
        }
    }
    return succeed(files);
}
