import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { authorizationError, validationError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import { maxImageUploadBytes } from "../../../common/images/constants";
import { ImageContentTypeSchema } from "../../../common/images/types";
import { maxPostPhotos, postPhotoSizes } from "../constants";
import { postPhotoUploadKey } from "../utils/postPhotoKeys";
import type { GetCallingUser } from "../../users/types/calling-user";

export const CreatePostMediaUploadsMutationInputSchema = z.object({
    media: z.array(z.object({
        // Made by the app (a ULID); uploads live under the caller's id, so it can't reach anyone else's.
        mediaId: z.ulid(),
        // One file per size in postPhotoSizes (by the longer side), resized on the device.
        files: z.array(z.object({
            size: z.int().positive(),
            contentType: ImageContentTypeSchema,
            contentLength: z.int().positive().max(maxImageUploadBytes),
        })).min(1),
    })).min(1).max(maxPostPhotos),
});

export type CreatePostMediaUploadsMutationInput = z.infer<typeof CreatePostMediaUploadsMutationInputSchema>;

export const CreatePostMediaUploadsMutationOutputSchema = z.object({
    // A presigned PUT per file. Storage refuses an upload whose Content-Type or size differs from what was declared.
    uploads: z.array(z.object({ mediaId: z.ulid(), size: z.int(), url: z.url(), contentType: ImageContentTypeSchema })),
});

export type CreatePostMediaUploadsMutationOutput = z.infer<typeof CreatePostMediaUploadsMutationOutputSchema>;

/**
 * The first step of posting photos (up to maxPostPhotos at once): upload URLs
 * for every size of each. The app uploads there, confirms them
 * (confirmPostMediaUploadsMutation), then creates or edits the post with them.
 */
export const createPostMediaUploadsMutation: Mutation<{ input: CreatePostMediaUploadsMutationInput, output: CreatePostMediaUploadsMutationOutput }, {
    getCallingUser: GetCallingUser;
    isPostingEnabled: () => boolean;
    createUploadUrl: (args: { key: string; contentType: string; contentLength: number }) => Promise<string>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "create-post-media-uploads", callerId: caller?.userId },
        });
        return allowed;
    }
    if (!dependencies.isPostingEnabled()) {
        logger.info("Posting is turned off", { callerId: allowed.value.userId });
        return fail(authorizationError("Posting is turned off"));
    }

    const ids = new Set(input.media.map((media) => media.mediaId));
    if (ids.size !== input.media.length) {
        return fail(validationError("The same photo is in there twice"));
    }
    for (const media of input.media) {
        const givenSizes = media.files.map((file) => file.size).sort((a, b) => a - b).join(",");
        if (givenSizes !== postPhotoSizes.join(",")) {
            logger.warn("Post photo upload with the wrong sizes", { mediaId: media.mediaId, givenSizes });
            return fail(validationError(`A photo needs one file at each size: ${postPhotoSizes.join(",")}`));
        }
    }

    const userId = allowed.value.userId;
    const uploads = await Promise.all(input.media.flatMap((media) => media.files.map(async (file) => ({
        mediaId: media.mediaId,
        size: file.size,
        contentType: file.contentType,
        url: await dependencies.createUploadUrl({
            key: postPhotoUploadKey({ userId, mediaId: media.mediaId, size: file.size }),
            contentType: file.contentType,
            contentLength: file.contentLength,
        }),
    }))));
    return succeed({ uploads });
}
