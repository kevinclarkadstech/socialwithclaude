import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { conflict } from "../../../utils/failures";
import { requireCaller } from "../../../logic/authorization/requireCaller";
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
}> = async ({ input, dependencies }) => {
    const allowed = requireCaller(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;
    if (allowed.value.profile) return conflict("Profile already exists");
    if (await dependencies.getUserProfileByUsername({ username: input.username })) return conflict("Username is taken");

    return succeed(await dependencies.createUserProfile({ ...input, userId: allowed.value.userId }));
}
