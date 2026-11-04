import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";
import { UserFollowSchema, type UserFollow } from "../types/user-follow";

export const AcceptFollowRequestMutationInputSchema = UserProfileSchema.pick({ username: true });

export type AcceptFollowRequestMutationInput = z.infer<typeof AcceptFollowRequestMutationInputSchema>;

export const AcceptFollowRequestMutationOutputSchema = UserFollowSchema;

export type AcceptFollowRequestMutationOutput = z.infer<typeof AcceptFollowRequestMutationOutputSchema>;

/** Accepts `username`'s pending request to follow the caller. */
export const acceptFollowRequestMutation: Mutation<{ input: AcceptFollowRequestMutationInput, output: AcceptFollowRequestMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    acceptUserFollowRequest: (args: { userId: string; followerId: string }) => Promise<UserFollow | null>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) return notFound("User not found");

    const follow = await dependencies.acceptUserFollowRequest({ userId: allowed.value.userId, followerId: target.userId });
    if (!follow) return notFound("Request not found");
    return succeed(follow);
}
