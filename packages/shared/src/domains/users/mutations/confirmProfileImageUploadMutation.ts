import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { validationError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import { imageContentTypes, maxImageUploadBytes } from "../../../common/images/constants";
import { inspectImage, stripImageMetadata } from "../../../common/images/utils";
import { profileImageWidths } from "../constants";
import { ProfileImageKindSchema } from "../types/profile-image";
import { profileImageHeight, profileImageKey, profileImageUploadKey } from "../utils/profileImageKeys";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const ConfirmProfileImageUploadMutationInputSchema = z.object({
    kind: ProfileImageKindSchema,
    uploadId: z.ulid(),
});

export type ConfirmProfileImageUploadMutationInput = z.infer<typeof ConfirmProfileImageUploadMutationInputSchema>;

export const ConfirmProfileImageUploadMutationOutputSchema = UserProfileSchema;

export type ConfirmProfileImageUploadMutationOutput = z.infer<typeof ConfirmProfileImageUploadMutationOutputSchema>;

/**
 * Finishes changing the caller's avatar or cover. Every width must have been
 * uploaded, be a JPEG or WebP of exactly that size, and fit the size limit;
 * then each is stripped of metadata (EXIF location and the like) and published
 * at the user's fixed key. The profile's updatedAt moves on, which changes the
 * images' URLs (?v=) everywhere, so caches pick up the new ones.
 */
export const confirmProfileImageUploadMutation: Mutation<{ input: ConfirmProfileImageUploadMutationInput, output: ConfirmProfileImageUploadMutationOutput }, {
    getCallingUser: GetCallingUser;
    readUpload: (args: { key: string }) => Promise<Uint8Array | null>;
    putMedia: (args: { key: string; bytes: Uint8Array; contentType: string }) => Promise<void>;
    deleteUploads: (args: { keys: string[] }) => Promise<void>;
    touchUserProfile: (args: { userId: string }) => Promise<UserProfile>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "confirm-profile-image-upload", callerId: caller?.userId },
        });
        return allowed;
    }
    const userId = allowed.value.userId;

    const files = profileImageWidths[input.kind].map((width) => ({
        width,
        uploadKey: profileImageUploadKey({ userId, uploadId: input.uploadId, kind: input.kind, width }),
    }));
    const uploadKeys = files.map((file) => file.uploadKey);
    const prepared: { key: string; bytes: Uint8Array; contentType: string }[] = [];
    for (const file of files) {
        const bytes = await dependencies.readUpload({ key: file.uploadKey });
        if (!bytes) {
            logger.info("Profile image upload missing", { userId, uploadKey: file.uploadKey });
            // Whatever did arrive is of no use now.
            await dependencies.deleteUploads({ keys: uploadKeys });
            return fail(validationError("The upload didn't finish. Try again."));
        }
        const info = inspectImage(bytes);
        const expectedHeight = profileImageHeight({ kind: input.kind, width: file.width });
        // Rounding on the device can be a pixel off.
        const isExpectedSize = info !== null && info.width === file.width && Math.abs(info.height - expectedHeight) <= 1;
        if (!info || !isExpectedSize || bytes.length > maxImageUploadBytes) {
            logger.warn("Profile image upload refused", { userId, uploadKey: file.uploadKey, info, bytes: bytes.length });
            await dependencies.deleteUploads({ keys: uploadKeys });
            return fail(validationError("That image couldn't be used. Try a different one."));
        }
        prepared.push({
            key: profileImageKey({ userId, kind: input.kind, width: file.width }),
            bytes: stripImageMetadata(bytes, info.format),
            contentType: imageContentTypes[info.format],
        });
    }

    await Promise.all(prepared.map((media) => dependencies.putMedia(media)));
    await dependencies.deleteUploads({ keys: uploadKeys });
    const profile = await dependencies.touchUserProfile({ userId });
    return succeed(profile);
}
