import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { validationError } from "../../../../error-handling";
import { requireCallerWithProfile } from "../../../../common/authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../common/authorization/logDisallowedResult/logDisallowedResult";
import { photoContentTypes, maxPhotoUploadBytes } from "../../../../common/photos/constants";
import { inspectPhoto, stripPhotoMetadata } from "../../../../common/photos/utils";
import { profilePhotoWidths } from "../../constants";
import { ProfilePhotoKindSchema } from "../../types/profile-photo";
import { profilePhotoHeight, profilePhotoKey, profilePhotoUploadKey } from "../../utils/profilePhotoKeys";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";

export const ConfirmProfilePhotoUploadMutationInputSchema = z.object({
    kind: ProfilePhotoKindSchema,
    uploadId: z.ulid(),
});

export type ConfirmProfilePhotoUploadMutationInput = z.infer<typeof ConfirmProfilePhotoUploadMutationInputSchema>;

export const ConfirmProfilePhotoUploadMutationOutputSchema = UserProfileSchema;

export type ConfirmProfilePhotoUploadMutationOutput = z.infer<typeof ConfirmProfilePhotoUploadMutationOutputSchema>;

/**
 * Finishes changing the caller's avatar or cover. Every width must have been
 * uploaded, be a JPEG or WebP of exactly that size, and fit the size limit;
 * then each is stripped of metadata (EXIF location and the like) and published
 * at the user's fixed key. The profile's updatedAt moves on, which changes the
 * photos' URLs (?v=) everywhere, so caches pick up the new ones.
 */
export const confirmProfilePhotoUploadMutation: Mutation<{ input: ConfirmProfilePhotoUploadMutationInput, output: ConfirmProfilePhotoUploadMutationOutput }, {
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
            details: { action: "confirm-profile-photo-upload", callerId: caller?.userId },
        });
        return allowed;
    }
    const userId = allowed.value.userId;

    const files = profilePhotoWidths[input.kind].map((width) => ({
        width,
        uploadKey: profilePhotoUploadKey({ userId, uploadId: input.uploadId, kind: input.kind, width }),
    }));
    const uploadKeys = files.map((file) => file.uploadKey);
    const prepared: { key: string; bytes: Uint8Array; contentType: string }[] = [];
    for (const file of files) {
        const bytes = await dependencies.readUpload({ key: file.uploadKey });
        if (!bytes) {
            logger.info("Profile photo upload missing", { userId, uploadKey: file.uploadKey });
            // Whatever did arrive is of no use now.
            await dependencies.deleteUploads({ keys: uploadKeys });
            return fail(validationError("The upload didn't finish. Try again."));
        }
        const info = inspectPhoto(bytes);
        const expectedHeight = profilePhotoHeight({ kind: input.kind, width: file.width });
        // Rounding on the device can be a pixel off.
        const isExpectedSize = info !== null && info.width === file.width && Math.abs(info.height - expectedHeight) <= 1;
        if (!info || !isExpectedSize || bytes.length > maxPhotoUploadBytes) {
            logger.warn("Profile photo upload refused", { userId, uploadKey: file.uploadKey, info, bytes: bytes.length });
            await dependencies.deleteUploads({ keys: uploadKeys });
            return fail(validationError("That photo couldn't be used. Try a different one."));
        }
        prepared.push({
            key: profilePhotoKey({ userId, kind: input.kind, width: file.width }),
            bytes: stripPhotoMetadata(bytes, info.format),
            contentType: photoContentTypes[info.format],
        });
    }

    await Promise.all(prepared.map((media) => dependencies.putMedia(media)));
    await dependencies.deleteUploads({ keys: uploadKeys });
    const profile = await dependencies.touchUserProfile({ userId });
    return succeed(profile);
}
