import {
    CreateUserProfileMutationInputSchema,
    GetMySessionsQueryInputSchema,
    RevokeOtherSessionsMutationInputSchema,
    RevokeSessionMutationInputSchema,
    RestoreAccountMutationInputSchema,
    ScheduleAccountDeletionMutationInputSchema,
    SendAccountDeletionCodeMutationInputSchema,
    SignOutMutationInputSchema,
    createUserProfileMutation,
    restoreAccountMutation,
    scheduleAccountDeletionMutation,
    sendAccountDeletionCodeMutation,
    getMySessionsQuery,
    revokeOtherSessionsMutation,
    revokeSessionMutation,
    signOutMutation,
} from "@myapp/shared/domains";

import { createUserProfile, getUserProfileByUsername, getUserSessions, restoreAccount, scheduleAccountDeletion } from "../../../data-access";
import { sendAccountDeletionCode, verifyAccountDeletionCode } from "../../../accounts";
import { procedure, router } from "../trpc";

/*
 * Signed-in devices. These read the sessions table directly instead of
 * better-auth's /list-sessions, which needs a "fresh" session (signed in
 * within a day) and returns every session's token to the browser. Here the
 * browser only ever sees session ids; revoking looks the token up on the
 * server and goes through better-auth, so its own cleanup still runs.
 */
export const authRouter = router({
    /** Completes sign-up by creating the caller's profile and settings. */
    signUp: procedure.input(CreateUserProfileMutationInputSchema).mutation(({ ctx, input }) =>
        createUserProfileMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, createUserProfile },
        }),
    ),

    getMySessions: procedure.input(GetMySessionsQueryInputSchema).query(({ ctx, input }) =>
        getMySessionsQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserSessions },
        }),
    ),

    revokeSession: procedure.input(RevokeSessionMutationInputSchema).mutation(({ ctx, input }) =>
        revokeSessionMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getUserSessions,
                revokeSessionToken: async (token) => {
                    await ctx.auth.api.revokeSession({ body: { token }, headers: ctx.reqHeaders });
                },
            },
        }),
    ),

    revokeOtherSessions: procedure.input(RevokeOtherSessionsMutationInputSchema).mutation(({ ctx, input }) =>
        revokeOtherSessionsMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                revokeOtherSessions: async () => {
                    await ctx.auth.api.revokeOtherSessions({ headers: ctx.reqHeaders });
                },
            },
        }),
    ),

    signOut: procedure.input(SignOutMutationInputSchema).mutation(({ ctx, input }) =>
        signOutMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                // Also for someone whose account is scheduled for deletion.
                getCallingUser: ctx.getAccountHolder,
                signOut: async () => {
                    const { headers } = await ctx.auth.api.signOut({ headers: ctx.reqHeaders, returnHeaders: true });
                    // Forward better-auth's cookie-clearing Set-Cookie headers to the client.
                    for (const cookie of headers.getSetCookie()) {
                        ctx.resHeaders.append("set-cookie", cookie);
                    }
                },
            },
        }),
    ),

    /** Emails a code to confirm deleting the caller's account with. */
    sendAccountDeletionCode: procedure.input(SendAccountDeletionCodeMutationInputSchema).mutation(({ ctx, input }) =>
        sendAccountDeletionCodeMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getAccountHolder, sendAccountDeletionCode },
        }),
    ),

    /** Deletes the caller's account (restorable for accountDeletionGraceDays), signing out every device. */
    scheduleAccountDeletion: procedure.input(ScheduleAccountDeletionMutationInputSchema).mutation(({ ctx, input }) =>
        scheduleAccountDeletionMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getAccountHolder, verifyAccountDeletionCode, scheduleAccountDeletion },
        }),
    ),

    /** Cancels the caller's account deletion. */
    restoreAccount: procedure.input(RestoreAccountMutationInputSchema).mutation(({ ctx, input }) =>
        restoreAccountMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getAccountHolder, restoreAccount },
        }),
    ),
});
