import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canManageAccount } from "../../authorization/canManageAccount/canManageAccount";

export const DeleteUnfinishedAccountMutationInputSchema = z.object({}).default({});

export type DeleteUnfinishedAccountMutationInput = z.infer<typeof DeleteUnfinishedAccountMutationInputSchema>;

export const DeleteUnfinishedAccountMutationOutputSchema = z.null();

export type DeleteUnfinishedAccountMutationOutput = z.infer<typeof DeleteUnfinishedAccountMutationOutputSchema>;

/**
 * Deletes the caller's account at once while sign-up isn't finished (no
 * profile yet, so nothing in it but an email address): when someone turns
 * out to be too young to sign up. An account with a profile goes through
 * scheduleAccountDeletionMutation instead.
 */
export const deleteUnfinishedAccountMutation: Mutation<{ input: DeleteUnfinishedAccountMutationInput, output: DeleteUnfinishedAccountMutationOutput }, {
    getCallingUser: GetCallingUser;
    deleteUnfinishedAccount: (args: { userId: string }) => Promise<void>;
}> = async ({ context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canManageAccount({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "delete-unfinished-account", callerId: caller?.userId } });
        return allowed;
    }
    if (allowed.value.profile) {
        return fail(conflictError("Sign-up is finished: delete the account from Settings instead"));
    }
    await dependencies.deleteUnfinishedAccount({ userId: allowed.value.userId });
    return succeed();
};
