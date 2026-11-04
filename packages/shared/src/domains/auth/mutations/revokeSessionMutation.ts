import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { invalid, notFound } from "../../../utils/failures";
import { requireCaller } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { UserSessionSchema, type UserSession } from "../../users/types/user-session";

export const RevokeSessionMutationInputSchema = UserSessionSchema.pick({ id: true });

export type RevokeSessionMutationInput = z.infer<typeof RevokeSessionMutationInputSchema>;

export const RevokeSessionMutationOutputSchema = z.undefined();

export type RevokeSessionMutationOutput = z.infer<typeof RevokeSessionMutationOutputSchema>;

/** Signs one of the caller's other devices out (signOut is for this one). */
export const revokeSessionMutation: Mutation<{ input: RevokeSessionMutationInput, output: RevokeSessionMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserSessions: (args: { userId: string }) => Promise<UserSession[]>;
    revokeSessionToken: (token: string) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCaller(caller);
    if (!allowed.ok) {
        logDisallowedResult(logger, allowed, { action: "revoke-session", callerId: caller?.userId });
        return allowed;
    }

    if (input.id === allowed.value.sessionId) {
        // The UI offers signOut, not revoke, for this device.
        logger.warn("Tried to revoke the current session", { callerId: allowed.value.userId });
        return invalid("Use signOut for this device");
    }

    const sessions = await dependencies.getUserSessions({ userId: allowed.value.userId });
    const session = sessions.find((s) => s.id === input.id);
    if (!session) {
        // Already signed out or expired, or not the caller's.
        logger.info("Session to revoke not found", { callerId: allowed.value.userId, sessionId: input.id });
        return notFound("Session not found");
    }

    await dependencies.revokeSessionToken(session.token);
    return succeed();
}
