import { z } from 'zod';
import path from 'node:path';
import dotenv from 'dotenv';

export function loadServerConfig() {
    if (process.env.NODE_ENV !== 'production') {
        const serverEnvPath = path.resolve(process.cwd(), './src/server/.env.local');

        dotenv.config({
            path: serverEnvPath
        });

        // Optional: Log it to your terminal to ensure it's pointing to the right place
        console.log(`[Nitro] Loaded local server environment from: ${serverEnvPath}`);
    }
}

export const ServerConfigSchema = z.object({
    DATABASE_URL: z.string(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function parseServerConfig(defaultConfig = process.env): ServerConfig {
    return ServerConfigSchema.parse(defaultConfig)
}

export function getServerConfig(defaultConfig = process.env): ServerConfig {
    return parseServerConfig(defaultConfig)
}