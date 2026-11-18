import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canManagePushTokens } from "../../authorization/canManagePushTokens/canManagePushTokens";
import { PushPlatformSchema } from "../../types/push";

export const RegisterPushTokenMutationInputSchema = z.object({
    // The device's Firebase Cloud Messaging token.
    token: z.string().trim().min(10).max(4096),
    platform: PushPlatformSchema,
});

export type RegisterPushTokenMutationInput = z.infer<typeof RegisterPushTokenMutationInputSchema>;

export const RegisterPushTokenMutationOutputSchema = z.null();

export type RegisterPushTokenMutationOutput = z.infer<typeof RegisterPushTokenMutationOutputSchema>;

/**
 * Sends the caller's push notifications to this device, for as long as
 * they're signed in on it. A device that was someone else's before (signed
 * out, then into another account) moves to the caller.
 */
export const registerPushTokenMutation: Mutation<{ input: RegisterPushTokenMutationInput, output: RegisterPushTokenMutationOutput }, {
    getCallingUser: GetCallingUser;
    savePushToken: (args: { token: string; platform: RegisterPushTokenMutationInput["platform"]; userId: string; sessionId: string }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canManagePushTokens({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "register-push-token", callerId: caller?.userId } });
        return allowed;
    }
    await dependencies.savePushToken({ ...input, userId: allowed.value.userId, sessionId: allowed.value.sessionId });
    return succeed();
};
