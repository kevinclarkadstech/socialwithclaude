import { z } from 'zod';
import path from 'node:path';
import dotenv from 'dotenv';

export const ServerConfigSchema = z.object({
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    // The API's own public URL (better-auth builds its callback URLs from it).
    BETTER_AUTH_URL: z.string(),
    // The web app's origin: allowed by CORS and trusted by better-auth.
    WEB_APP_URL: z.url(),
    // Social sign-in. Each provider is turned on only when its id and secret are set.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_CLIENT_SECRET: z.string().optional(),
    // The iOS app's bundle id, for Apple sign-in from the native app.
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),
});

export const serverConfig = (() => {
    if (process.env.NODE_ENV !== 'production') {
        const serverEnvPath = path.resolve(process.cwd(), './.env.local');
        console.log(serverEnvPath)
        dotenv.config({
            path: serverEnvPath
        });

        // Optional: Log it to your terminal to ensure it's pointing to the right place
        console.log(`[Nitro] Loaded local server environment from: ${serverEnvPath}`);
    }
    return ServerConfigSchema.parse(process.env)
})();