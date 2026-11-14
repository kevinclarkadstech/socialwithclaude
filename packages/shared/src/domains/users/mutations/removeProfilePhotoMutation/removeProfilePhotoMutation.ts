import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { profilePhotoWidths } from "../../constants";
import { ProfilePhotoKindSchema } from "../../types/profile-photo";
import { profilePhotoKey } from "../../utils/profilePhotoKeys";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";
import { canUpdateMyProfile } from "../../authorization/canUpdateMyProfile/canUpdateMyProfile";

export const RemoveProfilePhotoMutationInputSchema = z.object({ kind: ProfilePhotoKindSchema });

export type RemoveProfilePhotoMutationInput = z.infer<typeof RemoveProfilePhotoMutationInputSchema>;

export const RemoveProfilePhotoMutationOutputSchema = UserProfileSchema;

export type RemoveProfilePhotoMutationOutput = z.infer<typeof RemoveProfilePhotoMutationOutputSchema>;

/**
 * Removes the caller's avatar or cover (initials or the gradient show again).
 * updatedAt moves on, so cached copies stop being used. Succeeds if there was none.
 */
export const removeProfilePhotoMutation: Mutation<{ input: RemoveProfilePhotoMutationInput, output: RemoveProfilePhotoMutationOutput }, {
    getCallingUser: GetCallingUser;
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    touchUserProfile: (args: { userId: string }) => Promise<UserProfile>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canUpdateMyProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "remove-profile-photo", callerId: caller?.userId },
        });
        return allowed;
    }
    const userId = allowed.value.userId;
    await dependencies.deleteMedia({
        keys: profilePhotoWidths[input.kind].map((width) => profilePhotoKey({ userId, kind: input.kind, width })),
    });
    const profile = await dependencies.touchUserProfile({ userId });
    return succeed(profile);
}
