import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canFollowUser } from "../../../logic/authorization/users/canFollowUser";
import type { GetCallingUser } from "../types/calling-user";
import { UserFollowSchema, type UserFollow } from "../types/user-follow";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";
import type { UserSettings } from "../types/user-settings";

export const FollowUserMutationInputSchema = UserProfileSchema.pick({ username: true });

export type FollowUserMutationInput = z.infer<typeof FollowUserMutationInputSchema>;

export const FollowUserMutationOutputSchema = UserFollowSchema;

export type FollowUserMutationOutput = z.infer<typeof FollowUserMutationOutputSchema>;

/**
 * Follows a user right away if their profile is public; otherwise asks to,
 * pending their response. Following again returns the existing follow.
 */
export const followUserMutation: Mutation<{ input: FollowUserMutationInput, output: FollowUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    getUserSettings: (args: { userId: string }) => Promise<UserSettings | null>;
    followUser: (args: { followerId: string; followingId: string; status: "accepted" | "pending" }) => Promise<UserFollow>;
}> = async ({ input, dependencies }) => {
    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) return notFound("User not found");

    const allowed = canFollowUser(await dependencies.getCallingUser(), target);
    if (!allowed.ok) return allowed;

    const settings = await dependencies.getUserSettings({ userId: target.userId });
    if (!settings) return notFound("User not found");

    return succeed(await dependencies.followUser({
        followerId: allowed.value.userId,
        followingId: target.userId,
        status: settings.profileVisibility === "public" ? "accepted" : "pending",
    }));
}
