import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db, schema } from "@/server/data-access";
import { serverConfig } from "@/server/config";

export const auth = betterAuth({
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
