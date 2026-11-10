import { photoContentTypes, maxPhotoUploadBytes } from "../constants";
import { inspectPhoto, longSideDimensions, photoKey, photoKeys, stripPhotoMetadata, type PhotoInfo } from "../utils";
import type { AppLogger } from "../../../observability";
import { validationError } from "../../../error-handling";
import type { Result } from "../../../types/result";
import { fail, succeed } from "../../../utils/result";

type CheckedFile = { size: number; bytes: Uint8Array; info: PhotoInfo };

/**
 * Publishes photos the app uploaded for something (a post, later a comment
 * or chat), on the server, as it's saved: for each, every size in `sizes`
 * must be there and be a JPEG or WebP whose longer side is that size, all in
 * one shape (no longer and thinner than `maxAspectRatio`), within the size limit. Each that passes is stripped of metadata (EXIF location and
 * the like) and copied to the media bucket at the same key. One that doesn't
 * is left out (the caller warns about it). The uploads are deleted either way.
 * Returns the published photos with their real dimensions.
 */
export async function publishUploadedPhotos({ userId, parentId, photos, sizes, maxAspectRatio, logger, storage }: {
    userId: string;
    parentId: string;
    photos: { id: string }[];
    sizes: readonly number[];
    maxAspectRatio: number;
    logger: AppLogger;
    storage: {
        readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
        putMedia: (args: { key: string; bytes: Uint8Array; contentType: string }) => Promise<void>;
        deleteUploads: (args: { keys: string[] }) => Promise<void>;
    };
}): Promise<{ id: string; width: number; height: number }[]> {
    const published: { id: string; width: number; height: number }[] = [];
    for (const { id } of photos) {
        const files = await readAndCheck({ userId, parentId, photoId: id, sizes, maxAspectRatio, readUpload: storage.readUpload });
        if (!files.ok) {
            logger.warn("Photo left out", { userId, parentId, photoId: id, reason: files.error.message });
            continue;
        }
        await Promise.all(files.value.map((file) => storage.putMedia({
            key: photoKey({ userId, parentId, photoId: id, size: file.size }),
            bytes: stripPhotoMetadata(file.bytes, file.info.format),
            contentType: photoContentTypes[file.info.format],
        })));
        const largest = files.value[files.value.length - 1]!.info;
        published.push({ id, width: largest.width, height: largest.height });
    }
    await storage.deleteUploads({ keys: photos.flatMap(({ id }) => photoKeys({ userId, parentId, photoId: id, sizes })) });
    return published;
}

/** Every size of one photo's upload, checked; or why it can't be used. */
async function readAndCheck({ userId, parentId, photoId, sizes, maxAspectRatio, readUpload }: {
    userId: string;
    parentId: string;
    photoId: string;
    sizes: readonly number[];
    maxAspectRatio: number;
    readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
}): Promise<Result<CheckedFile[]>> {
    const files: CheckedFile[] = [];
    for (const size of sizes) {
        const bytes = await readUpload({ key: photoKey({ userId, parentId, photoId, size }) });
        if (!bytes) {
            return fail(validationError(`size ${size} missing`));
        }
        const info = inspectPhoto(bytes);
        if (!info || bytes.length > maxPhotoUploadBytes || Math.max(info.width, info.height) !== size) {
            return fail(validationError(`size ${size} unusable`));
        }
        files.push({ size, bytes, info });
    }
    // The largest size sets the shape; the others must match it (rounding on the device can be a pixel off).
    const largest = files[files.length - 1]!.info;
    if (Math.max(largest.width, largest.height) / Math.min(largest.width, largest.height) > maxAspectRatio) {
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
