import { betterAuth } from "better-auth";
import { bearer, emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { newId, schema, type Database } from "../data-access/db";
import { nativeAppOrigins, serverConfig } from "../config";
import { sendOtp } from "../notifications";
import { rootLogger } from "../observability";

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
                    });
                },
                otpLength: 6,
                expiresIn: 5 * 60,
                allowedAttempts: 3,
                // Only a hash is stored, so a database leak doesn't leak live codes.
                storeOTP: "hashed",
            }),
        ],
        // Off: the API's own rate limits (src/rate-limiting) cover /api/auth; better-auth's are in memory, per instance.
        rateLimit: { enabled: false },
        advanced: {
            database: {
                // ULIDs, like every other id in the app.
                generateId: () => newId(),
            },
        },
    });
}
