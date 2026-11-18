import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canManageAccount } from "../../authorization/canManageAccount/canManageAccount";

export const RestoreAccountMutationInputSchema = z.object({}).default({});

export type RestoreAccountMutationInput = z.infer<typeof RestoreAccountMutationInputSchema>;

export const RestoreAccountMutationOutputSchema = z.null();

export type RestoreAccountMutationOutput = z.infer<typeof RestoreAccountMutationOutputSchema>;

/** Cancels the caller's account deletion: everything they made shows again. */
export const restoreAccountMutation: Mutation<{ input: RestoreAccountMutationInput, output: RestoreAccountMutationOutput }, {
    getCallingUser: GetCallingUser;
    restoreAccount: (args: { userId: string }) => Promise<void>;
}> = async ({ context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canManageAccount({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "restore-account", callerId: caller?.userId } });
        return allowed;
    }
    if (!allowed.value.deletionScheduledAt) {
        return fail(conflictError("Your account isn't scheduled for deletion"));
    }
    await dependencies.restoreAccount({ userId: allowed.value.userId });
    logger.info("Account restored", { userId: allowed.value.userId });
    return succeed();
};
