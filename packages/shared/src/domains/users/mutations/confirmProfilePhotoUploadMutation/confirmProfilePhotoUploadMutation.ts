import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { validationError } from "../../../../error-handling";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { ProfilePhotoKindSchema, type ProfilePhotoKind, type PublishProfilePhotoResult } from "../../types/profile-photo";
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
 * Finishes changing the caller's avatar or cover: the server publishes the
 * upload (every width must be there and be exactly that size; each is stripped
 * of metadata), or nothing changes. The profile's updatedAt moves on, which
 * changes the photos' URLs (?v=) everywhere, so caches pick up the new ones.
 */
export const confirmProfilePhotoUploadMutation: Mutation<{ input: ConfirmProfilePhotoUploadMutationInput, output: ConfirmProfilePhotoUploadMutationOutput }, {
    getCallingUser: GetCallingUser;
    /** Checks and publishes the uploaded widths (on the server), clearing the uploads either way. */
    publishProfilePhoto: (args: { userId: string; kind: ProfilePhotoKind; uploadId: string }) => Promise<PublishProfilePhotoResult>;
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

    const published = await dependencies.publishProfilePhoto({ userId, kind: input.kind, uploadId: input.uploadId });
    if (published.status === "missing") {
        logger.info("Profile photo upload missing", { userId, uploadId: input.uploadId, detail: published.detail });
        return fail(validationError("The upload didn't finish. Try again."));
    }
    if (published.status === "unusable") {
        logger.warn("Profile photo upload refused", { userId, uploadId: input.uploadId, detail: published.detail });
        return fail(validationError("That photo couldn't be used. Try a different one."));
    }
    const profile = await dependencies.touchUserProfile({ userId });
    return succeed(profile);
}
