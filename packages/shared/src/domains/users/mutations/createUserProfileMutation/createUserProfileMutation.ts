import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";
import { canCreateUserProfile } from "../../authorization/canCreateUserProfile/canCreateUserProfile";

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
    /** "username-taken" if someone took it meanwhile; "profile-exists" if the user already has one (e.g. a double submit). */
    createUserProfile: (args: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about">) => Promise<UserProfile | "username-taken" | "profile-exists">;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canCreateUserProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "create-user-profile", callerId: caller?.userId },
        });
        return allowed;
    }

    const existingProfile = await dependencies.getUserProfileByUsername({ username: input.username });
    if (existingProfile) {
        logger.info("Username is taken", { callerId: allowed.value.userId, username: input.username });
        return fail(conflictError("Username is taken"));
    }

    const profile = await dependencies.createUserProfile({ ...input, userId: allowed.value.userId });
    if (profile === "username-taken") {
        logger.info("Username taken before the profile was created", { callerId: allowed.value.userId, username: input.username });
        return fail(conflictError("Username is taken"));
    }
    if (profile === "profile-exists") {
        // Passed canCreateUserProfile, but another request (e.g. a double submit) created it first.
        logger.warn("Profile created by another request meanwhile", { callerId: allowed.value.userId });
        return fail(conflictError("Profile already exists"));
    }
    return succeed(profile);
}
