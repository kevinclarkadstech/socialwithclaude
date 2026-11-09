import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { conflictError, validationError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import { imageContentTypes, maxImageUploadBytes, maxPhotoAspectRatio, postPhotoSizes } from "../../media/constants";
import { inspectImage } from "../../media/utils/inspectImage";
import { postPhotoDimensions, postPhotoKey, postPhotoPath, postPhotoUploadKey } from "../../media/utils/postPhotoKeys";
import { stripImageMetadata } from "../../media/utils/stripImageMetadata";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostMediaSchema, type PostMedia, type UploadedPostMedia } from "../types/post-media";

export const ConfirmPostMediaUploadMutationInputSchema = z.object({
    mediaId: z.ulid(),
    placeholder: PostMediaSchema.shape.placeholder,
});

export type ConfirmPostMediaUploadMutationInput = z.infer<typeof ConfirmPostMediaUploadMutationInputSchema>;

export const ConfirmPostMediaUploadMutationOutputSchema = PostMediaSchema;

export type ConfirmPostMediaUploadMutationOutput = z.infer<typeof ConfirmPostMediaUploadMutationOutputSchema>;

/**
 * Finishes uploading a photo for a post. Every size must have been uploaded,
 * be a JPEG or WebP whose longer side is that size, all in the same shape
 * (no more than 3:1), and fit the size limit; then each is stripped of
 * metadata (EXIF location and the like) and published at an address that
 * can't be guessed. The photo is the caller's, on no post until they create
 * or edit one with it. Confirming again returns the same photo.
 */
export const confirmPostMediaUploadMutation: Mutation<{ input: ConfirmPostMediaUploadMutationInput, output: ConfirmPostMediaUploadMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostMediaById: (args: { id: string }) => Promise<UploadedPostMedia | null>;
    readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
    putMedia: (args: { key: string; bytes: Uint8Array; contentType: string }) => Promise<void>;
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    deleteUploads: (args: { keys: string[] }) => Promise<void>;
    /** A random token for the published address (unguessable). */
    newToken: () => string;
    /** Records the photo; null if its id is already used. */
    createPostMedia: (args: {
        id: string;
        userId: string;
        path: string;
        width: number;
        height: number;
        placeholder: string | null;
    }) => Promise<UploadedPostMedia | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "confirm-post-media-upload", callerId: caller?.userId },
        });
        return allowed;
    }
    const userId = allowed.value.userId;

    const uploadKeys = postPhotoSizes.map((size) => postPhotoUploadKey({ userId, mediaId: input.mediaId, size }));
    const existing = await dependencies.getPostMediaById({ id: input.mediaId });
    if (existing) {
        if (existing.createdBy !== userId) {
            // Client ids are ULIDs, so a clash means the client reused one.
            logger.warn("Post media id already used", { mediaId: input.mediaId, callerId: userId });
            return fail(conflictError("Id is already used"));
        }
        // A retry of a confirm that already worked; anything uploaded again isn't needed.
        logger.info("Post media already confirmed", { mediaId: input.mediaId, callerId: userId });
        await dependencies.deleteUploads({ keys: uploadKeys });
        return succeed(toPostMedia(existing));
    }

    const refuse = async (message: string, details: object) => {
        logger.warn("Post photo upload refused", { userId, mediaId: input.mediaId, ...details });
        // Whatever did arrive is of no use now.
        await dependencies.deleteUploads({ keys: uploadKeys });
        return fail(validationError(message));
    };

    const files: { size: number; bytes: Uint8Array; info: NonNullable<ReturnType<typeof inspectImage>> }[] = [];
    for (const [index, size] of postPhotoSizes.entries()) {
        const bytes = await dependencies.readUpload({ key: uploadKeys[index]! });
        if (!bytes) {
            return refuse("The upload didn't finish. Try again.", { size, missing: true });
        }
        const info = inspectImage(bytes);
        if (!info || bytes.length > maxImageUploadBytes || Math.max(info.width, info.height) !== size) {
            return refuse("That photo couldn't be used. Try a different one.", { size, info, bytes: bytes.length });
        }
        files.push({ size, bytes, info });
    }

    // The largest size sets the shape; the others must match it (rounding on the device can be a pixel off).
    const largest = files[files.length - 1]!.info;
    if (Math.max(largest.width, largest.height) / Math.min(largest.width, largest.height) > maxPhotoAspectRatio) {
        return refuse("That photo is too long and thin. Try cropping it.", { width: largest.width, height: largest.height });
    }
    for (const file of files) {
        const expected = postPhotoDimensions({ width: largest.width, height: largest.height, size: file.size });
        if (Math.abs(file.info.width - expected.width) > 1 || Math.abs(file.info.height - expected.height) > 1) {
            return refuse("That photo couldn't be used. Try a different one.", { size: file.size, info: file.info, expected });
        }
    }

    const path = postPhotoPath({ mediaId: input.mediaId, token: dependencies.newToken() });
    const publishedKeys = files.map((file) => postPhotoKey({ path, size: file.size }));
    await Promise.all(files.map((file, index) => dependencies.putMedia({
        key: publishedKeys[index]!,
        bytes: stripImageMetadata(file.bytes, file.info.format),
        contentType: imageContentTypes[file.info.format],
    })));

    const created = await dependencies.createPostMedia({
        id: input.mediaId,
        userId,
        path,
        width: largest.width,
        height: largest.height,
        placeholder: input.placeholder,
    });
    if (!created) {
        // Someone took the id while this one was publishing.
        await dependencies.deleteMedia({ keys: publishedKeys });
        logger.warn("Post media id already used", { mediaId: input.mediaId, callerId: userId });
        return fail(conflictError("Id is already used"));
    }

    await dependencies.deleteUploads({ keys: uploadKeys });
    return succeed(toPostMedia(created));
}

function toPostMedia({ id, path, width, height, placeholder, caption }: UploadedPostMedia): PostMedia {
    return { id, path, width, height, placeholder, caption };
}
