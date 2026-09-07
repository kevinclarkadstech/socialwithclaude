import { z } from 'zod';

export const ServerConfigSchema = z.object({
    DATABASE_URL: z.string(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function parseServerConfig(defaultConfig = process.env): ServerConfig {
    return ServerConfigSchema.parse(defaultConfig)
}