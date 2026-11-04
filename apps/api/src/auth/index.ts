import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { newId, schema, type Database } from "../data-access/db";
import { serverConfig } from "../config";

export function createAuthInstance(db: Database) {
    return betterAuth({
        secret: serverConfig.BETTER_AUTH_SECRET,
        baseURL: serverConfig.BETTER_AUTH_URL,
        trustedOrigins: [serverConfig.WEB_APP_URL],
        database: drizzleAdapter(db, {
            provider: "pg",
            schema,
            usePlural: true,
        }),
        emailAndPassword: {
            enabled: true,
        },
        advanced: {
            database: {
                // ULIDs, like every other id in the app.
                generateId: () => newId(),
            },
        },
    });
}
