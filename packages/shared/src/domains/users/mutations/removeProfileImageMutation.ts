import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import { profileImageWidths } from "../constants";
import { ProfileImageKindSchema } from "../types/profile-image";
import { profileImageKey } from "../utils/profileImageKeys";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const RemoveProfileImageMutationInputSchema = z.object({ kind: ProfileImageKindSchema });

export type RemoveProfileImageMutationInput = z.infer<typeof RemoveProfileImageMutationInputSchema>;

export const RemoveProfileImageMutationOutputSchema = UserProfileSchema;

export type RemoveProfileImageMutationOutput = z.infer<typeof RemoveProfileImageMutationOutputSchema>;

/**
 * Removes the caller's avatar or cover (initials or the gradient show again).
 * updatedAt moves on, so cached copies stop being used. Succeeds if there was none.
 */
export const removeProfileImageMutation: Mutation<{ input: RemoveProfileImageMutationInput, output: RemoveProfileImageMutationOutput }, {
    getCallingUser: GetCallingUser;
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    touchUserProfile: (args: { userId: string }) => Promise<UserProfile>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "remove-profile-image", callerId: caller?.userId },
        });
        return allowed;
    }
    const userId = allowed.value.userId;
    await dependencies.deleteMedia({
        keys: profileImageWidths[input.kind].map((width) => profileImageKey({ userId, kind: input.kind, width })),
    });
    const profile = await dependencies.touchUserProfile({ userId });
    return succeed(profile);
}
