import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canModerate } from "../../authorization/canModerate/canModerate";
import type { ModerationSubject } from "../../types/reported-item";

export const UnbanUserMutationInputSchema = z.object({
    userId: z.ulid(),
});

export type UnbanUserMutationInput = z.infer<typeof UnbanUserMutationInputSchema>;

export const UnbanUserMutationOutputSchema = z.null();

export type UnbanUserMutationOutput = z.infer<typeof UnbanUserMutationOutputSchema>;

/** Lifts someone's ban, so they can sign in again. Logged. Unbanning someone who isn't banned succeeds. Admins only. */
export const unbanUserMutation: Mutation<{ input: UnbanUserMutationInput, output: UnbanUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getModerationSubject: (args: { userId: string }) => Promise<ModerationSubject | null>;
    /** Lifts the ban and logs it, in one go. */
    unbanUser: (args: { userId: string; moderatorId: string }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canModerate({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "unban-user", callerId: caller?.userId } });
        return allowed;
    }

    const subject = await dependencies.getModerationSubject({ userId: input.userId });
    if (!subject) {
        return fail(notFoundError("User not found"));
    }
    if (!subject.isBanned) {
        return succeed();
    }

    await dependencies.unbanUser({ userId: subject.userId, moderatorId: allowed.value.userId });
    logger.info("User unbanned", { moderatorId: allowed.value.userId, userId: subject.userId });
    return succeed();
};
