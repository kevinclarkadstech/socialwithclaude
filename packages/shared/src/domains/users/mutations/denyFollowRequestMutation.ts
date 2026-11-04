import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";
import { UserFollowSchema, type UserFollow } from "../types/user-follow";

export const DenyFollowRequestMutationInputSchema = UserProfileSchema.pick({ username: true });

export type DenyFollowRequestMutationInput = z.infer<typeof DenyFollowRequestMutationInputSchema>;

export const DenyFollowRequestMutationOutputSchema = UserFollowSchema;

export type DenyFollowRequestMutationOutput = z.infer<typeof DenyFollowRequestMutationOutputSchema>;

/** Denies `username`'s pending request. They aren't told: it keeps looking pending to them. */
export const denyFollowRequestMutation: Mutation<{ input: DenyFollowRequestMutationInput, output: DenyFollowRequestMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    denyUserFollowRequest: (args: { userId: string; followerId: string }) => Promise<UserFollow | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile(caller);
    if (!allowed.ok) {
        logDisallowedResult(logger, allowed, { action: "deny-follow-request", callerId: caller?.userId });
        return allowed;
    }

    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) {
        logger.info("Follow requester not found", { username: input.username });
        return notFound("User not found");
    }

    const follow = await dependencies.denyUserFollowRequest({ userId: allowed.value.userId, followerId: target.userId });
    if (!follow) {
        logger.info("Follow request to deny not found", { callerId: allowed.value.userId, followerId: target.userId });
        return notFound("Request not found");
    }

    return succeed(follow);
}
