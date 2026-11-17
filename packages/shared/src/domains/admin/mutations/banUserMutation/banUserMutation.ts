import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError, validationError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canAdminister } from "../../authorization/canAdminister/canAdminister";
import type { ModerationSubject } from "../../types/reported-item";

export const BanUserMutationInputSchema = z.object({
    userId: z.ulid(),
    // Why, for the moderation log (and, later, for them).
    reason: z.string().trim().max(500).nullish(),
    // When the ban ends; null for good.
    expiresAt: z.iso.datetime().nullish(),
});

export type BanUserMutationInput = z.infer<typeof BanUserMutationInputSchema>;

export const BanUserMutationOutputSchema = z.null();

export type BanUserMutationOutput = z.infer<typeof BanUserMutationOutputSchema>;

/**
 * Bans someone: they're signed out everywhere and can't sign in until the
 * ban ends. Banning again replaces the reason and end. Logged. Admins only,
 * and not other admins or themselves.
 */
export const banUserMutation: Mutation<{ input: BanUserMutationInput, output: BanUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getModerationSubject: (args: { userId: string }) => Promise<ModerationSubject | null>;
    /** Sets the ban, ends their sessions and logs it, in one go. */
    banUser: (args: { userId: string; moderatorId: string; reason: string | null; expiresAt: Date | null }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canAdminister({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "ban-user", callerId: caller?.userId } });
        return allowed;
    }
    const moderatorId = allowed.value.userId;

    const subject = await dependencies.getModerationSubject({ userId: input.userId });
    if (!subject) {
        return fail(notFoundError("User not found"));
    }
    if (subject.userId === moderatorId) {
        return fail(validationError("You can't ban yourself"));
    }
    if (subject.role === "admin") {
        return fail(validationError("Admins can't be banned. Remove their admin role first."));
    }
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
        return fail(validationError("The ban has to end in the future"));
    }

    await dependencies.banUser({ userId: subject.userId, moderatorId, reason: input.reason ?? null, expiresAt });
    logger.info("User banned", { moderatorId, userId: subject.userId, expiresAt: expiresAt?.toISOString() ?? null });
    return succeed();
};
