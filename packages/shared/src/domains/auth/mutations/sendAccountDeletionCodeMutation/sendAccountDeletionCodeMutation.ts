import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canManageAccount } from "../../authorization/canManageAccount/canManageAccount";

export const SendAccountDeletionCodeMutationInputSchema = z.object({}).default({});

export type SendAccountDeletionCodeMutationInput = z.infer<typeof SendAccountDeletionCodeMutationInputSchema>;

export const SendAccountDeletionCodeMutationOutputSchema = z.null();

export type SendAccountDeletionCodeMutationOutput = z.infer<typeof SendAccountDeletionCodeMutationOutputSchema>;

/**
 * Emails the caller a code to confirm deleting their account with
 * (scheduleAccountDeletionMutation). A new code replaces the last one.
 */
export const sendAccountDeletionCodeMutation: Mutation<{ input: SendAccountDeletionCodeMutationInput, output: SendAccountDeletionCodeMutationOutput }, {
    getCallingUser: GetCallingUser;
    sendAccountDeletionCode: (args: { userId: string; email: string }) => Promise<void>;
}> = async ({ context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canManageAccount({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "send-account-deletion-code", callerId: caller?.userId } });
        return allowed;
    }
    if (allowed.value.deletionScheduledAt) {
        return fail(conflictError("Your account is already scheduled for deletion"));
    }
    await dependencies.sendAccountDeletionCode({ userId: allowed.value.userId, email: allowed.value.email });
    return succeed();
};
