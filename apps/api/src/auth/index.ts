import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, bearer, customSession, emailOTP } from "better-auth/plugins";
// The relations-v2 build speaks drizzle 1.0's relational queries (used for joins).
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";

import type { UserRole } from "@myapp/shared/domains";
import { newId, schema, type Database } from "../data-access/db";
import { getUserProfileAndBlockList } from "../data-access";
import { nativeAppOrigins, serverConfig } from "../config";
import { sendOtp } from "../notifications";
import { isEmailBanned } from "../accounts";
import { errorReporter, rootLogger } from "../observability";

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    APPLE_CLIENT_ID,
    APPLE_CLIENT_SECRET,
    APPLE_APP_BUNDLE_IDENTIFIER,
} = serverConfig;

const google = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
    : undefined;

const apple = APPLE_CLIENT_ID && APPLE_CLIENT_SECRET
    ? { clientId: APPLE_CLIENT_ID, clientSecret: APPLE_CLIENT_SECRET, appBundleIdentifier: APPLE_APP_BUNDLE_IDENTIFIER }
    : undefined;

/**
 * Sign-in is passwordless: a one-time code sent by email (which also signs
 * new users up), or Google / Apple when configured.
 */
export function createAuthInstance(db: Database) {
    return betterAuth({
        secret: serverConfig.BETTER_AUTH_SECRET,
        baseURL: serverConfig.BETTER_AUTH_URL,
        // Apple posts its sign-in response back from its own origin.
        trustedOrigins: [
            serverConfig.WEB_APP_URL,
            ...nativeAppOrigins,
            ...(apple ? ["https://appleid.apple.com"] : []),
        ],
        database: drizzleAdapter(db, {
            provider: "pg",
            schema,
            usePlural: true,
        }),
        emailAndPassword: {
            enabled: false,
        },
        databaseHooks: {
            user: {
                create: {
                    // Someone banned who then had their account deleted can't sign up again with that email.
                    before: async (user) => {
                        if (await isEmailBanned({ email: user.email })) {
                            throw new APIError("FORBIDDEN", { message: "This email can't be used to sign up. Contact support if you think this is a mistake." });
                        }
                    },
                },
            },
        },
        user: {
            additionalFields: {
                // Set by scheduleAccountDeletion; read with the session, so the app can offer to restore the account.
                deletionScheduledAt: { type: "date", required: false, input: false },
            },
        },
        socialProviders: {
            ...(google && { google }),
            ...(apple && { apple }),
        },
        plugins: [
            // The native app can't rely on cookies, so it sends the session token
            // as "Authorization: Bearer ..." (returned in the set-auth-token header).
            // Browsers keep using the HttpOnly cookie.
            bearer(),
            emailOTP({
                // Not awaited, so how long sending takes doesn't reveal whether the email has an account.
                sendVerificationOTP: async (data) => {
                    sendOtp({ email: data.email, code: data.otp, type: data.type }).catch((err: unknown) => {
                        rootLogger.error("Couldn't send a sign-in code", { err, type: data.type });
                        errorReporter.report({ error: err });
                    });
                },
                otpLength: 6,
                expiresIn: 5 * 60,
                allowedAttempts: 3,
                // Only a hash is stored, so a database leak doesn't leak live codes.
                storeOTP: "hashed",
            }),
            // Roles and bans: refuses sign-in to a banned user (and lifts a ban once it
            // has expired). The app bans through its own moderation mutations, which also
            // end the user's sessions and log it; the plugin's /admin endpoints are
            // admin-only and the app doesn't use them.
            admin({
                bannedUserMessage: "This account has been banned. Contact support if you think this is a mistake.",
            }),
            // Every signed-in tRPC request needs the caller's profile and block list
            // (see transport/trpc/context.ts), so the session lookup loads them too.
            customSession(async ({ user, session }) => {
                const { profile, blockList } = await getUserProfileAndBlockList({ userId: user.id });
                // The admin plugin's column; customSession's types only know better-auth's own user fields.
                const role: UserRole = (user as typeof user & { role?: string | null }).role === "admin" ? "admin" : "user";
                const { deletionScheduledAt } = user as typeof user & { deletionScheduledAt?: Date | null };
                return { user, session, profile, blockList, role, deletionScheduledAt: deletionScheduledAt ? new Date(deletionScheduledAt).toISOString() : null };
            }),
        ],
        // Off: the API's own rate limits (src/rate-limiting) cover /api/auth; better-auth's are in memory, per instance.
        rateLimit: { enabled: false },
        advanced: {
            database: {
                // ULIDs, like every other id in the app.
                generateId: () => newId(),
                // A session and its user in one query (needs the relations in data-access/db).
                joins: true,
            },
        },
    });
}
