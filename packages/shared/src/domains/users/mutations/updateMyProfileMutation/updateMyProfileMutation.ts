import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError } from "../../../../error-handling";
import { requireCallerWithProfile } from "../../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";

export const UpdateMyProfileMutationInputSchema = UserProfileSchema.pick({
    username: true,
    firstName: true,
    lastName: true,
    about: true,
});

export type UpdateMyProfileMutationInput = z.infer<typeof UpdateMyProfileMutationInputSchema>;

export const UpdateMyProfileMutationOutputSchema = UserProfileSchema;

export type UpdateMyProfileMutationOutput = z.infer<typeof UpdateMyProfileMutationOutputSchema>;

/**
 * Edits the caller's profile: username, name and about. Fails with a
 * conflict if the new username belongs to someone else.
 */
export const updateMyProfileMutation: Mutation<{ input: UpdateMyProfileMutationInput, output: UpdateMyProfileMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    // Null if the username was taken in the meantime.
    updateUserProfile: (args: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about">) => Promise<UserProfile | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-my-profile", callerId: caller?.userId },
        });
        return allowed;
    }

    const userId = allowed.value.userId;
    if (input.username !== allowed.value.profile.username) {
        const existingProfile = await dependencies.getUserProfileByUsername({ username: input.username });
        if (existingProfile && existingProfile.userId !== userId) {
            logger.info("Username is taken", { callerId: userId, username: input.username });
            return fail(conflictError("Username is taken"));
        }
    }

    const profile = await dependencies.updateUserProfile({ ...input, userId });
    if (!profile) {
        logger.info("Username taken before the update", { callerId: userId, username: input.username });
        return fail(conflictError("Username is taken"));
    }
    return succeed(profile);
}
