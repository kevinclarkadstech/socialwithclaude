import z from "zod";
import type { Mutation } from "../../../types/mutation";
import type { Result } from "../../../types/result";
import { fail, succeed } from "../../../utils/result";
import { conflictError, validationError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import { imageContentTypes, maxImageUploadBytes } from "../../../common/images/constants";
import { MediaSchema, type Media } from "../../../common/images/types";
import { inspectImage, longSideDimensions, stripImageMetadata, type ImageInfo } from "../../../common/images/utils";
import { maxPhotoAspectRatio, maxPostPhotos, postPhotoSizes } from "../constants";
import { mediaKey, mediaPath, postPhotoUploadKey } from "../utils/postPhotoKeys";
import type { GetCallingUser } from "../../users/types/calling-user";
import type { UploadedPostMedia } from "../types/post-media";

export const ConfirmPostMediaUploadsMutationInputSchema = z.object({
    media: z.array(z.object({
        mediaId: z.ulid(),
        placeholder: MediaSchema.shape.placeholder,
    })).min(1).max(maxPostPhotos),
});

export type ConfirmPostMediaUploadsMutationInput = z.infer<typeof ConfirmPostMediaUploadsMutationInputSchema>;

export const ConfirmPostMediaUploadsMutationOutputSchema = z.object({
    // In the order asked for.
    media: z.array(MediaSchema),
});

export type ConfirmPostMediaUploadsMutationOutput = z.infer<typeof ConfirmPostMediaUploadsMutationOutputSchema>;

type CheckedFile = { size: number; bytes: Uint8Array; info: ImageInfo };

/**
 * The second step of posting photos: checks what was uploaded for each, all
 * or nothing. Every size must be a JPEG or WebP whose longer side is that
 * size, all in one shape (no thinner than 3:1), within the size limit. Then
 * each is stripped of metadata (EXIF location and the like), published at an
 * address that can't be guessed, and recorded as the caller's, on no post
 * until they create or edit one with it. Photos already confirmed come back
 * as they are, so a retry is safe.
 */
export const confirmPostMediaUploadsMutation: Mutation<{ input: ConfirmPostMediaUploadsMutationInput, output: ConfirmPostMediaUploadsMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostMediaByIds: (args: { ids: string[] }) => Promise<UploadedPostMedia[]>;
    readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
    putMedia: (args: { key: string; bytes: Uint8Array; contentType: string }) => Promise<void>;
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    deleteUploads: (args: { keys: string[] }) => Promise<void>;
    /** A random token for a published address (unguessable). */
    newToken: () => string;
    /** Records the photos as the caller's; returns the ids it recorded (one already used is skipped). */
    createMedia: (args: { userId: string; media: Media[] }) => Promise<string[]>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "confirm-post-media-uploads", callerId: caller?.userId },
        });
        return allowed;
    }
    const userId = allowed.value.userId;
    const ids = input.media.map((media) => media.mediaId);
    if (new Set(ids).size !== ids.length) {
        return fail(validationError("The same photo is in there twice"));
    }
    const uploadKeys = (mediaId: string) => postPhotoSizes.map((size) => postPhotoUploadKey({ userId, mediaId, size }));

    const existing = await dependencies.getPostMediaByIds({ ids });
    if (existing.some((media) => media.createdBy !== userId)) {
        // Client ids are ULIDs, so a clash means the client reused one.
        logger.warn("Media id already used", { callerId: userId, ids });
        return fail(conflictError("Id is already used"));
    }
    const toConfirm = input.media.filter((media) => !existing.some((found) => found.id === media.mediaId));
    const allUploadKeys = input.media.flatMap((media) => uploadKeys(media.mediaId));

    // Check everything before publishing anything.
    const checked: { mediaId: string; placeholder: string | null; files: CheckedFile[] }[] = [];
    for (const media of toConfirm) {
        const files = await readAndCheck({ keys: uploadKeys(media.mediaId), readUpload: dependencies.readUpload });
        if (!files.ok) {
            logger.warn("Post photo upload refused", { userId, mediaId: media.mediaId, error: files.error });
            // Whatever did arrive is of no use now.
            await dependencies.deleteUploads({ keys: allUploadKeys });
            return files;
        }
        checked.push({ mediaId: media.mediaId, placeholder: media.placeholder, files: files.value });
    }

    const published: Media[] = [];
    for (const media of checked) {
        const path = mediaPath({ mediaId: media.mediaId, token: dependencies.newToken() });
        await Promise.all(media.files.map((file) => dependencies.putMedia({
            key: mediaKey({ path, size: file.size }),
            bytes: stripImageMetadata(file.bytes, file.info.format),
            contentType: imageContentTypes[file.info.format],
        })));
        const largest = media.files[media.files.length - 1]!.info;
        published.push({ id: media.mediaId, path, width: largest.width, height: largest.height, placeholder: media.placeholder });
    }

    const recorded = published.length > 0 ? await dependencies.createMedia({ userId, media: published }) : [];
    const lost = published.filter((media) => !recorded.includes(media.id));
    if (lost.length > 0) {
        // Someone took an id while these were publishing.
        await dependencies.deleteMedia({ keys: lost.flatMap((media) => postPhotoSizes.map((size) => mediaKey({ path: media.path, size }))) });
        logger.warn("Media id already used", { callerId: userId, ids: lost.map((media) => media.id) });
        return fail(conflictError("Id is already used"));
    }

    await dependencies.deleteUploads({ keys: allUploadKeys });
    const all: Media[] = [...existing.map(({ id, path, width, height, placeholder }) => ({ id, path, width, height, placeholder })), ...published];
    return succeed({ media: ids.map((id) => all.find((media) => media.id === id)!) });
}

/** Reads every size of one photo's upload and checks it, or says why it can't be used. */
async function readAndCheck({ keys, readUpload }: {
    keys: string[];
    readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
}): Promise<Result<CheckedFile[]>> {
    const files: CheckedFile[] = [];
    for (const [index, size] of postPhotoSizes.entries()) {
        const bytes = await readUpload({ key: keys[index]! });
        if (!bytes) {
            return fail(validationError("A photo didn't finish uploading. Try again.", { size, missing: true }));
        }
        const info = inspectImage(bytes);
        if (!info || bytes.length > maxImageUploadBytes || Math.max(info.width, info.height) !== size) {
            return fail(validationError("A photo couldn't be used. Try a different one.", { size, info, bytes: bytes.length }));
        }
        files.push({ size, bytes, info });
    }
    // The largest size sets the shape; the others must match it (rounding on the device can be a pixel off).
    const largest = files[files.length - 1]!.info;
    if (Math.max(largest.width, largest.height) / Math.min(largest.width, largest.height) > maxPhotoAspectRatio) {
        return fail(validationError("A photo is too long and thin. Try cropping it.", { width: largest.width, height: largest.height }));
    }
    for (const file of files) {
        const expected = longSideDimensions({ width: largest.width, height: largest.height, size: file.size });
        if (Math.abs(file.info.width - expected.width) > 1 || Math.abs(file.info.height - expected.height) > 1) {
            return fail(validationError("A photo couldn't be used. Try a different one.", { size: file.size, info: file.info, expected }));
        }
    }
    return succeed(files);
}
