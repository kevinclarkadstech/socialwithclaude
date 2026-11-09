import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { validationError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import { maxImageUploadBytes } from "../../../common/images/constants";
import { ImageContentTypeSchema } from "../../../common/images/types";
import { profileImageWidths } from "../constants";
import { ProfileImageKindSchema } from "../types/profile-image";
import { profileImageUploadKey } from "../utils/profileImageKeys";
import type { GetCallingUser } from "../types/calling-user";

export const CreateProfileImageUploadMutationInputSchema = z.object({
    kind: ProfileImageKindSchema,
    // Made by the app (a ULID), like post ids; uploads live under the caller's id, so it can't reach anyone else's.
    uploadId: z.ulid(),
    // One file per width the kind is stored at (profileImageWidths), already cropped and resized on the device.
    files: z.array(z.object({
        width: z.int().positive(),
        contentType: ImageContentTypeSchema,
        contentLength: z.int().positive().max(maxImageUploadBytes),
    })).min(1),
});

export type CreateProfileImageUploadMutationInput = z.infer<typeof CreateProfileImageUploadMutationInputSchema>;

export const CreateProfileImageUploadMutationOutputSchema = z.object({
    // A presigned PUT per file. Storage refuses an upload whose Content-Type or size differs from what was declared.
    uploads: z.array(z.object({ width: z.int(), url: z.url(), contentType: ImageContentTypeSchema })),
});

export type CreateProfileImageUploadMutationOutput = z.infer<typeof CreateProfileImageUploadMutationOutputSchema>;

/**
 * Starts changing the caller's avatar or cover: upload URLs for each width.
 * The app uploads there, then confirms (confirmProfileImageUploadMutation).
 */
export const createProfileImageUploadMutation: Mutation<{ input: CreateProfileImageUploadMutationInput, output: CreateProfileImageUploadMutationOutput }, {
    getCallingUser: GetCallingUser;
    createUploadUrl: (args: { key: string; contentType: string; contentLength: number }) => Promise<string>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "create-profile-image-upload", callerId: caller?.userId },
        });
        return allowed;
    }

    const expectedWidths = [...profileImageWidths[input.kind]].sort((a, b) => a - b).join(",");
    const givenWidths = input.files.map((file) => file.width).sort((a, b) => a - b).join(",");
    if (givenWidths !== expectedWidths) {
        logger.warn("Profile image upload with the wrong widths", { kind: input.kind, givenWidths, expectedWidths });
        return fail(validationError(`A profile image needs one file at each width: ${expectedWidths}`));
    }

    const uploads = await Promise.all(input.files.map(async (file) => ({
        width: file.width,
        contentType: file.contentType,
        url: await dependencies.createUploadUrl({
            key: profileImageUploadKey({ userId: allowed.value.userId, uploadId: input.uploadId, kind: input.kind, width: file.width }),
            contentType: file.contentType,
            contentLength: file.contentLength,
        }),
    })));
    return succeed({ uploads });
}
