import { z } from "zod";

const ConfigSchema = z.object({
    apiUrl: z.url(),
    environment: z.enum(["local", "development", "staging", "production", "test"]),
});

export type Config = z.infer<typeof ConfigSchema>;

export function mapEnvToConfig(env: ImportMetaEnv): Config {
    return {
        apiUrl: env.VITE_API_URL,
        environment: env.VITE_APP_ENV,
    };
}

export function getConfig(defaultConfig: Config = mapEnvToConfig(import.meta.env)): Config {
    return ConfigSchema.parse(defaultConfig);
}

export const config = getConfig();