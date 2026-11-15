import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canBlockUser } from "../../authorization/canBlockUser/canBlockUser";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserBlockSchema, type UserBlock } from "../../types/user-block";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";

export const BlockUserMutationInputSchema = UserProfileSchema.pick({ username: true });

export type BlockUserMutationInput = z.infer<typeof BlockUserMutationInputSchema>;

export const BlockUserMutationOutputSchema = UserBlockSchema;

export type BlockUserMutationOutput = z.infer<typeof BlockUserMutationOutputSchema>;

/**
 * Blocks a user, and ends any follow between the two, either way (requests
 * included): neither follows the other while blocked, and unblocking doesn't
 * bring a follow back. Blocking an already-blocked user returns the existing
 * block (and makes sure the follows are gone).
 */
export const blockUserMutation: Mutation<{ input: BlockUserMutationInput, output: BlockUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    blockUser: (args: { userId: string; blockedUserId: string }) => Promise<UserBlock>;
    /** Deletes any follow or follow request between the two, either way. */
    removeFollowsBetween: (args: { userId: string; otherUserId: string }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const target = await dependencies.getUserProfileByUsername(input);
    if (!target) {
        logger.info("User to block not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    const caller = await dependencies.getCallingUser();
    const allowed = canBlockUser({ caller, target });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "block-user", callerId: caller?.userId, targetUserId: target.userId },
        });
        return allowed;
    }

    const block = await dependencies.blockUser({ userId: allowed.value.userId, blockedUserId: target.userId });
    await dependencies.removeFollowsBetween({ userId: allowed.value.userId, otherUserId: target.userId });
    return succeed(block);
}
