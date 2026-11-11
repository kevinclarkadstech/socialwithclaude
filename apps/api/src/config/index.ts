import { z } from "zod";
import path from "node:path";
import dotenv from "dotenv";

export const ServerConfigSchema = z.object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // Signs sessions and tokens: a long random string (e.g. `openssl rand -base64 32`).
    BETTER_AUTH_SECRET: z.string().min(32).refine(
        (secret) => process.env.NODE_ENV !== "production" || secret !== "change-me-to-a-long-random-string",
        "Set a real secret, not the one from .env.example",
    ),
    // The API's own public URL (better-auth builds its callback URLs from it).
    BETTER_AUTH_URL: z.url(),
    // The web app's origin: allowed by CORS and trusted by better-auth.
    WEB_APP_URL: z.url(),
    // Social sign-in. Each provider is turned on only when its id and secret are set.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_CLIENT_SECRET: z.string().optional(),
    // The iOS app's bundle id, for Apple sign-in from the native app.
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),
    // Object storage, through the S3 API: Cloudflare R2 in production, Garage locally
    // (docker-compose; set up with infra/garage/init.sh). See .env.example.
    STORAGE_ENDPOINT: z.url(),
    STORAGE_REGION: z.string(),
    STORAGE_ACCESS_KEY_ID: z.string(),
    STORAGE_SECRET_ACCESS_KEY: z.string(),
    // Private: presigned uploads land here, and are processed before anything is public.
    STORAGE_UPLOADS_BUCKET: z.string(),
    // Public: processed photos, served from STORAGE_MEDIA_PUBLIC_URL.
    STORAGE_MEDIA_BUCKET: z.string(),
    STORAGE_MEDIA_PUBLIC_URL: z.url(),
});

/**
 * Where the Capacitor app runs: capacitor://localhost on iOS,
 * https://localhost on Android. Allowed by CORS and trusted by better-auth
 * alongside WEB_APP_URL.
 */
export const nativeAppOrigins = ["capacitor://localhost", "https://localhost"];

/** The validated environment. Locally it's read from apps/api/.env.local; a missing or bad value stops startup, naming it. */
export const serverConfig = (() => {
    if (process.env.NODE_ENV !== "production") {
        dotenv.config({ path: path.resolve(process.cwd(), "./.env.local"), quiet: true });
    }
    const parsed = ServerConfigSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error(`Invalid API environment:\n${z.prettifyError(parsed.error)}`);
    }
    return parsed.data;
})();
