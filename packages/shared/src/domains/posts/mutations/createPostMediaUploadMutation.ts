import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { validationError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import { maxImageUploadBytes, postPhotoSizes } from "../../media/constants";
import { ImageContentTypeSchema } from "../../media/types";
import { postPhotoUploadKey } from "../../media/utils/postPhotoKeys";
import type { GetCallingUser } from "../../users/types/calling-user";

export const CreatePostMediaUploadMutationInputSchema = z.object({
    // Made by the app (a ULID); uploads live under the caller's id, so it can't reach anyone else's.
    mediaId: z.ulid(),
    // One file per size in postPhotoSizes (by the longer side), resized on the device.
    files: z.array(z.object({
        size: z.int().positive(),
        contentType: ImageContentTypeSchema,
        contentLength: z.int().positive().max(maxImageUploadBytes),
    })).min(1),
});

export type CreatePostMediaUploadMutationInput = z.infer<typeof CreatePostMediaUploadMutationInputSchema>;

export const CreatePostMediaUploadMutationOutputSchema = z.object({
    // A presigned PUT per file. Storage refuses an upload whose Content-Type or size differs from what was declared.
    uploads: z.array(z.object({ size: z.int(), url: z.url(), contentType: ImageContentTypeSchema })),
});

export type CreatePostMediaUploadMutationOutput = z.infer<typeof CreatePostMediaUploadMutationOutputSchema>;

/**
 * Starts adding a photo to a post: upload URLs for each size. The app uploads
 * there, then confirms (confirmPostMediaUploadMutation), then adds the photo's
 * id to the post it creates or edits.
 */
export const createPostMediaUploadMutation: Mutation<{ input: CreatePostMediaUploadMutationInput, output: CreatePostMediaUploadMutationOutput }, {
    getCallingUser: GetCallingUser;
    createUploadUrl: (args: { key: string; contentType: string; contentLength: number }) => Promise<string>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "create-post-media-upload", callerId: caller?.userId },
        });
        return allowed;
    }

    const givenSizes = input.files.map((file) => file.size).sort((a, b) => a - b).join(",");
    if (givenSizes !== postPhotoSizes.join(",")) {
        logger.warn("Post photo upload with the wrong sizes", { givenSizes });
        return fail(validationError(`A photo needs one file at each size: ${postPhotoSizes.join(",")}`));
    }
    const uploads = await Promise.all(input.files.map(async (file) => ({
        size: file.size,
        contentType: file.contentType,
        url: await dependencies.createUploadUrl({
            key: postPhotoUploadKey({ userId: allowed.value.userId, mediaId: input.mediaId, size: file.size }),
            contentType: file.contentType,
            contentLength: file.contentLength,
        }),
    })));
    return succeed({ uploads });
}
