import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
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
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "accept-follow-request", callerId: caller?.userId },
        });
        return allowed;
    }

    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) {
        logger.info("Follow requester not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    const follow = await dependencies.acceptUserFollowRequest({ userId: allowed.value.userId, followerId: target.userId });
    if (!follow) {
        logger.info("Follow request to accept not found", { callerId: allowed.value.userId, followerId: target.userId });
        return fail(notFoundError("Request not found"));
    }

    return succeed(follow);
}
