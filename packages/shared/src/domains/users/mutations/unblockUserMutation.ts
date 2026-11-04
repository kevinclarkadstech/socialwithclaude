import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const UnblockUserMutationInputSchema = UserProfileSchema.pick({ username: true });

export type UnblockUserMutationInput = z.infer<typeof UnblockUserMutationInputSchema>;

export const UnblockUserMutationOutputSchema = z.undefined();

export type UnblockUserMutationOutput = z.infer<typeof UnblockUserMutationOutputSchema>;

/** Unblocking a user who isn't blocked succeeds. */
export const unblockUserMutation: Mutation<{ input: UnblockUserMutationInput, output: UnblockUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    unblockUser: (args: { userId: string; blockedUserId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile(caller);
    if (!allowed.ok) {
        logDisallowedResult(logger, allowed, { action: "unblock-user", callerId: caller?.userId });
        return allowed;
    }

    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) {
        logger.info("User to unblock not found", { username: input.username });
        return notFound("User not found");
    }

    await dependencies.unblockUser({ userId: allowed.value.userId, blockedUserId: target.userId });
    return succeed();
}
