import {
    CreateUserProfileMutationInputSchema,
    GetMySessionsQueryInputSchema,
    RevokeOtherSessionsMutationInputSchema,
    RevokeSessionMutationInputSchema,
    SignOutMutationInputSchema,
    createUserProfileMutation,
    getMySessionsQuery,
    revokeOtherSessionsMutation,
    revokeSessionMutation,
    signOutMutation,
} from "@myapp/shared/domains";

import { createUserProfile, getUserProfileByUsername, getUserSessions } from "../../../data-access";
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
                getCallingUser: ctx.getCallingUser,
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
});
