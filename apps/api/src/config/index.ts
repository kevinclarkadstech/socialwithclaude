import { z } from 'zod';
import path from 'node:path';
import dotenv from 'dotenv';

export const ServerConfigSchema = z.object({
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string(),
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