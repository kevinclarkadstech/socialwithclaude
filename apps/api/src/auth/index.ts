import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { schema, type Database } from "../data-access";
import { serverConfig } from "../config";

export function createAuthInstance(db: Database) {
    return betterAuth({
        secret: serverConfig.BETTER_AUTH_SECRET,
        baseURL: serverConfig.BETTER_AUTH_URL,
        database: drizzleAdapter(db, {
            provider: "pg",
            schema,
            usePlural: true,
        }),
        emailAndPassword: {
            enabled: true,
        },
    });
}
