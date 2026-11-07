import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { requireCaller } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";

export const RevokeOtherSessionsMutationInputSchema = z.object({}).default({});

export type RevokeOtherSessionsMutationInput = z.infer<typeof RevokeOtherSessionsMutationInputSchema>;

export const RevokeOtherSessionsMutationOutputSchema = z.null();

export type RevokeOtherSessionsMutationOutput = z.infer<typeof RevokeOtherSessionsMutationOutputSchema>;

/** Signs every device out except this one. */
export const revokeOtherSessionsMutation: Mutation<{ input: RevokeOtherSessionsMutationInput, output: RevokeOtherSessionsMutationOutput }, {
    getCallingUser: GetCallingUser;
    revokeOtherSessions: () => Promise<void>;
}> = async ({ context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCaller({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "revoke-other-sessions", callerId: caller?.userId },
        });
        return allowed;
    }

    await dependencies.revokeOtherSessions();
    return succeed();
}
