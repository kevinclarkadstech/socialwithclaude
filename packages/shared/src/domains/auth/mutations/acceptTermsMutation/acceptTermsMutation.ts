import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canManageAccount } from "../../authorization/canManageAccount/canManageAccount";
import { currentTermsVersion } from "../../constants";

export const AcceptTermsMutationInputSchema = z.object({
    // The version they were shown, so agreeing to an older one (an out-of-date app) doesn't count as agreeing to this one.
    version: z.string().regex(/^\d+\.\d+$/),
});

export type AcceptTermsMutationInput = z.infer<typeof AcceptTermsMutationInputSchema>;

export const AcceptTermsMutationOutputSchema = z.object({
    termsAcceptedVersion: z.string(),
});

export type AcceptTermsMutationOutput = z.infer<typeof AcceptTermsMutationOutputSchema>;

/**
 * Records that the caller agreed to the current Terms of Service and
 * Privacy Policy (when they've changed since; sign-up records it the first
 * time). Agreeing to an older version records that one.
 */
export const acceptTermsMutation: Mutation<{ input: AcceptTermsMutationInput, output: AcceptTermsMutationOutput }, {
    getCallingUser: GetCallingUser;
    recordTermsAccepted: (args: { userId: string; version: string }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canManageAccount({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "accept-terms", callerId: caller?.userId } });
        return allowed;
    }
    await dependencies.recordTermsAccepted({ userId: allowed.value.userId, version: input.version });
    if (input.version !== currentTermsVersion) {
        logger.info("Agreed to terms that aren't the current ones", { userId: allowed.value.userId, version: input.version, current: currentTermsVersion });
    }
    return succeed({ termsAcceptedVersion: input.version });
};
