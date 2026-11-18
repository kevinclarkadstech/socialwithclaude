import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError, validationError } from "../../../../error-handling";
import { minimumAge, underMinimumAgeReason } from "../../constants";
import { ageInYears } from "../../utils/ageInYears/ageInYears";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";
import { canCreateUserProfile } from "../../authorization/canCreateUserProfile/canCreateUserProfile";

export const CreateUserProfileMutationInputSchema = UserProfileSchema.pick({
    username: true,
    firstName: true,
    lastName: true,
    about: true,
}).extend({
    // The version of the Terms of Service and Privacy Policy they agreed to (see currentTermsVersion); sign-up needs it.
    acceptedTermsVersion: z.string().regex(/^\d+\.\d+$/, "Agree to the Terms of Service and Privacy Policy to continue"),
    // When they were born (month and year only), to check they're old enough (see minimumAge). Never shown.
    birthYear: z.int().min(1900).max(2100),
    birthMonth: z.int().min(1).max(12),
});

export type CreateUserProfileMutationInput = z.infer<typeof CreateUserProfileMutationInputSchema>;

export const CreateUserProfileMutationOutputSchema = UserProfileSchema;

export type CreateUserProfileMutationOutput = z.infer<typeof CreateUserProfileMutationOutputSchema>;

/**
 * Completes sign-up for a signed-in user: creates their profile and
 * settings, and records which version of the terms they agreed to and
 * their birth month and year. Fails with a conflict if the username is
 * taken or they already have a profile. Someone younger than minimumAge is
 * refused (reason underMinimumAgeReason) and their account, which has
 * nothing in it yet but an email address, is deleted along with what they
 * entered.
 */
export const createUserProfileMutation: Mutation<{ input: CreateUserProfileMutationInput, output: CreateUserProfileMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    /** "username-taken" if someone took it meanwhile; "profile-exists" if the user already has one (e.g. a double submit). */
    createUserProfile: (args: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about"> & {
        acceptedTermsVersion: string;
        birthYear: number;
        birthMonth: number;
    }) => Promise<UserProfile | "username-taken" | "profile-exists">;
    /** Deletes the caller's account while it has no profile (someone too young to sign up). */
    deleteUnfinishedAccount: (args: { userId: string }) => Promise<void>;
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

    if (ageInYears({ birthYear: input.birthYear, birthMonth: input.birthMonth }) < minimumAge) {
        // Nothing they entered is kept: not even the email address they signed in with.
        await dependencies.deleteUnfinishedAccount({ userId: allowed.value.userId });
        logger.info("Sign-up refused: under the minimum age", { callerId: allowed.value.userId });
        return fail(validationError("Sorry, you can't use the app.", { reason: underMinimumAgeReason }));
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
