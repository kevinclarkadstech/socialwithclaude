import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError, validationError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { ReportReasonSchema, type ReportReason } from "../../../posts/types/report";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canAdminister } from "../../authorization/canAdminister/canAdminister";
import { ReportKindSchema, type ModerationSubject, type ReportKind } from "../../types/reported-item";

export const WarnUserMutationInputSchema = z.object({
    userId: z.ulid(),
    // What it was for; the app words the warning from it.
    reason: ReportReasonSchema,
    // The admin's own words, added to the warning (and the log).
    note: z.string().trim().max(1000).nullish(),
    // What it was about, when warning from a report.
    kind: ReportKindSchema.nullish(),
    targetId: z.ulid().nullish(),
});

export type WarnUserMutationInput = z.infer<typeof WarnUserMutationInputSchema>;

export const WarnUserMutationOutputSchema = z.null();

export type WarnUserMutationOutput = z.infer<typeof WarnUserMutationOutputSchema>;

/**
 * Warns someone: they get a "warning" notification, and it goes in the
 * moderation log (it counts in their history). Admins only, and not
 * themselves or other admins.
 */
export const warnUserMutation: Mutation<{ input: WarnUserMutationInput, output: WarnUserMutationOutput }, {
    getCallingUser: GetCallingUser;
    getModerationSubject: (args: { userId: string }) => Promise<ModerationSubject | null>;
    /** Sends the warning notification and logs it, in one go. */
    warnUser: (args: {
        userId: string;
        moderatorId: string;
        reason: ReportReason;
        note: string | null;
        kind: ReportKind | null;
        targetId: string | null;
    }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canAdminister({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "warn-user", callerId: caller?.userId } });
        return allowed;
    }
    const moderatorId = allowed.value.userId;

    const subject = await dependencies.getModerationSubject({ userId: input.userId });
    if (!subject) {
        return fail(notFoundError("User not found"));
    }
    if (subject.userId === moderatorId) {
        return fail(validationError("You can't warn yourself"));
    }
    if (subject.role === "admin") {
        return fail(validationError("Admins can't be warned"));
    }

    await dependencies.warnUser({
        userId: subject.userId,
        moderatorId,
        reason: input.reason,
        note: input.note ?? null,
        kind: input.kind ?? null,
        targetId: input.targetId ?? null,
    });
    logger.info("User warned", { moderatorId, userId: subject.userId, reason: input.reason });
    return succeed();
};
