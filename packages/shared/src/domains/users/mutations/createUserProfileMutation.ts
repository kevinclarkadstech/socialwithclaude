import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { conflictError } from "../../../error-handling";
import { requireCaller } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const CreateUserProfileMutationInputSchema = UserProfileSchema.pick({
    username: true,
    firstName: true,
    lastName: true,
    about: true,
});

export type CreateUserProfileMutationInput = z.infer<typeof CreateUserProfileMutationInputSchema>;

export const CreateUserProfileMutationOutputSchema = UserProfileSchema;

export type CreateUserProfileMutationOutput = z.infer<typeof CreateUserProfileMutationOutputSchema>;

/**
 * Completes sign-up for a signed-in user: creates their profile and
 * settings. Fails with a conflict if the username is taken or they already
 * have a profile.
 */
export const createUserProfileMutation: Mutation<{ input: CreateUserProfileMutationInput, output: CreateUserProfileMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    createUserProfile: (args: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about">) => Promise<UserProfile>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCaller({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "create-user-profile", callerId: caller?.userId },
        });
        return allowed;
    }

    if (allowed.value.profile) {
        // The UI only offers sign-up to users without a profile.
        logger.warn("User already has a profile", { callerId: allowed.value.userId });
        return fail(conflictError("Profile already exists"));
    }

    const existingProfile = await dependencies.getUserProfileByUsername({ username: input.username });
    if (existingProfile) {
        logger.info("Username is taken", { callerId: allowed.value.userId, username: input.username });
        return fail(conflictError("Username is taken"));
    }

    const profile = await dependencies.createUserProfile({ ...input, userId: allowed.value.userId });
    return succeed(profile);
}
