import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError, validationError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canManageAccount } from "../../authorization/canManageAccount/canManageAccount";
import { accountDeletesAt } from "../../utils/accountDeletesAt/accountDeletesAt";

export const ScheduleAccountDeletionMutationInputSchema = z.object({
    // The code sendAccountDeletionCodeMutation emailed them.
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type ScheduleAccountDeletionMutationInput = z.infer<typeof ScheduleAccountDeletionMutationInputSchema>;

export const ScheduleAccountDeletionMutationOutputSchema = z.object({
    // When it's deleted for good, unless they sign in and restore it first.
    deletesAt: z.iso.datetime(),
});

export type ScheduleAccountDeletionMutationOutput = z.infer<typeof ScheduleAccountDeletionMutationOutputSchema>;

/**
 * Deletes the caller's account, once they've confirmed with the emailed
 * code: it's hidden everywhere at once and every device is signed out.
 * Signing back in within accountDeletionGraceDays lets them restore it
 * (restoreAccountMutation); after that, everything is deleted for good.
 */
export const scheduleAccountDeletionMutation: Mutation<{ input: ScheduleAccountDeletionMutationInput, output: ScheduleAccountDeletionMutationOutput }, {
    getCallingUser: GetCallingUser;
    /** Whether `code` is the caller's current one; using it (right or wrong) counts toward its few attempts. */
    verifyAccountDeletionCode: (args: { userId: string; code: string }) => Promise<boolean>;
    /** Marks the account for deletion at `at` and ends all its sessions. */
    scheduleAccountDeletion: (args: { userId: string; at: Date }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canManageAccount({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "schedule-account-deletion", callerId: caller?.userId } });
        return allowed;
    }
    const userId = allowed.value.userId;
    if (allowed.value.deletionScheduledAt) {
        return fail(conflictError("Your account is already scheduled for deletion"));
    }
    const isValid = await dependencies.verifyAccountDeletionCode({ userId, code: input.code });
    if (!isValid) {
        return fail(validationError("That code isn't right, or it expired. Ask for a new one."));
    }
    const now = new Date();
    await dependencies.scheduleAccountDeletion({ userId, at: now });
    const deletesAt = accountDeletesAt(now);
    logger.info("Account scheduled for deletion", { userId, deletesAt: deletesAt.toISOString() });
    return succeed({ deletesAt: deletesAt.toISOString() });
};
