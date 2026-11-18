import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canManagePushTokens } from "../../authorization/canManagePushTokens/canManagePushTokens";

export const UnregisterPushTokenMutationInputSchema = z.object({
    token: z.string().trim().min(10).max(4096),
});

export type UnregisterPushTokenMutationInput = z.infer<typeof UnregisterPushTokenMutationInputSchema>;

export const UnregisterPushTokenMutationOutputSchema = z.null();

export type UnregisterPushTokenMutationOutput = z.infer<typeof UnregisterPushTokenMutationOutputSchema>;

/**
 * Stops push notifications to this device (e.g. they turned them off on
 * it). Only the caller's own token; anyone else's is left alone. Signing out
 * does this anyway.
 */
export const unregisterPushTokenMutation: Mutation<{ input: UnregisterPushTokenMutationInput, output: UnregisterPushTokenMutationOutput }, {
    getCallingUser: GetCallingUser;
    deletePushToken: (args: { token: string; userId: string }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canManagePushTokens({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "unregister-push-token", callerId: caller?.userId } });
        return allowed;
    }
    await dependencies.deletePushToken({ token: input.token, userId: allowed.value.userId });
    return succeed();
};
